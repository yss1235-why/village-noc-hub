import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Generate transaction hash
const generateTransactionHash = (data) => {
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
};

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  // This is an internal function, not exposed directly to users
  // Called from applications.js when user submits application
  
  const deductPointsForApplication = async (userId, applicationId, villageId) => {
    const POINTS_PER_APPLICATION = 15;
    
    await sql`BEGIN`;
    
    try {
      // Get user current balance with row lock
      const user = await sql`
        SELECT id, username, point_balance 
        FROM users 
        WHERE id = ${userId} AND role = 'applicant'
        FOR UPDATE
      `;

      if (user.length === 0) {
        await sql`ROLLBACK`;
        throw new Error('User not found');
      }

      const currentBalance = user[0].point_balance || 0;
      
      if (currentBalance < POINTS_PER_APPLICATION) {
        await sql`ROLLBACK`;
        throw new Error(`Insufficient points. Required: ${POINTS_PER_APPLICATION}, Current: ${currentBalance}`);
      }

      const newBalance = currentBalance - POINTS_PER_APPLICATION;

      // Create transaction data
      const transactionData = {
        userId,
        amount: -POINTS_PER_APPLICATION,
        previousBalance: currentBalance,
        newBalance,
        timestamp: Date.now(),
        applicationId
      };

      const transactionHash = generateTransactionHash(transactionData);

      // Insert deduction transaction
      await sql`
        INSERT INTO point_transactions (
          transaction_hash, user_id, type, amount,
          previous_balance, new_balance, application_id, reason
        )
        VALUES (
          ${transactionHash}, ${userId}, 'DEDUCT', ${-POINTS_PER_APPLICATION},
          ${currentBalance}, ${newBalance}, ${applicationId}, 'NOC Application Fee'
        )
      `;

      // Update user balance
      await sql`
        UPDATE users 
        SET point_balance = ${newBalance}
        WHERE id = ${userId}
      `;

    // Create point distribution record (5-5-5)
await sql`
  INSERT INTO point_distributions (
    application_id, village_id, total_points,
    server_maintenance_points, super_admin_points, village_admin_points
  )
  VALUES (
    ${applicationId}, ${villageId}, 15, 5, 5, 5
  )
`;

// ACTUALLY TRANSFER 5 POINTS TO VILLAGE ADMIN
const villageAdmin = await sql`
  SELECT id, point_balance 
  FROM users 
  WHERE village_id = ${villageId} AND role = 'village_admin'
`;

if (villageAdmin.length > 0) {
  const adminId = villageAdmin[0].id;
  const currentAdminBalance = villageAdmin[0].point_balance || 0;
  const newAdminBalance = currentAdminBalance + 5; // village admin gets 5 points

  // Update village admin balance
  await sql`UPDATE users SET point_balance = ${newAdminBalance} WHERE id = ${adminId}`;

  // Create transaction record for admin points
  const adminTransactionHash = crypto.createHash('sha256')
    .update(`${adminId}-${applicationId}-${Date.now()}-admin`)
    .digest('hex');

  await sql`
    INSERT INTO point_transactions (
      transaction_hash, user_id, type, amount, previous_balance, new_balance,
      application_id, reason
    )
    VALUES (
      ${adminTransactionHash}, ${adminId}, 'CREATE', 5, ${currentAdminBalance}, ${newAdminBalance},
      ${applicationId}, 'Village Admin Commission'
    )
  `;
}

await sql`COMMIT`;
      
      return {
        success: true,
        transactionHash,
        newBalance,
        pointsDeducted: POINTS_PER_APPLICATION
      };
      
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  };

  // Export the function for use in other files
  return { deductPointsForApplication };
};
