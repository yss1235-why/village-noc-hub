import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Starting point system migration...');

    // 1. Add new columns to users table
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12),
      ADD COLUMN IF NOT EXISTS passport_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS id_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS police_verification TEXT,
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(15),
      ADD COLUMN IF NOT EXISTS center_shop_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS point_balance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
    `;

    // 2. Create point transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_hash VARCHAR(64) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        admin_id UUID REFERENCES users(id),
        type VARCHAR(20) NOT NULL CHECK (type IN ('CREATE', 'DEDUCT', 'ADMIN_RECOVERY')),
        amount INTEGER NOT NULL,
        previous_balance INTEGER NOT NULL,
        new_balance INTEGER NOT NULL,
        application_id UUID,
        reason TEXT,
        admin_signature VARCHAR(512),
        admin_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW(),
        is_immutable BOOLEAN DEFAULT true
      )
    `;

    // 3. Create point distributions table
    await sql`
      CREATE TABLE IF NOT EXISTS point_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID,
        total_points INTEGER DEFAULT 15,
        server_maintenance_points INTEGER DEFAULT 5,
        super_admin_points INTEGER DEFAULT 5,
        village_admin_points INTEGER DEFAULT 5,
        village_id UUID REFERENCES villages(id),
        distributed_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid_out', 'archived'))
      )
    `;

    // 4. Create monthly payouts table
    await sql`
      CREATE TABLE IF NOT EXISTS monthly_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_month VARCHAR(7) NOT NULL,
        recipient_type VARCHAR(20) CHECK (recipient_type IN ('super_admin', 'village_admin', 'server_maintenance')),
        recipient_id UUID REFERENCES users(id),
        village_id UUID REFERENCES villages(id),
        total_points INTEGER,
        payout_date TIMESTAMP,
        payout_reference VARCHAR(100),
        distribution_ids UUID[]
      )
    `;

    // 5. Create admin audit log table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT NOW(),
        signature VARCHAR(512)
      )
    `;

    // 6. Clean up any anonymous applications (optional - based on your preference)
    // await sql`DELETE FROM noc_applications WHERE applicant_name = 'Anonymous' OR applicant_name IS NULL`;

    // 7. Initialize all existing users with 0 point balance
    await sql`UPDATE users SET point_balance = 0 WHERE point_balance IS NULL`;

    console.log('Migration completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Point system migration completed successfully',
        details: {
          users_table_updated: true,
          point_transactions_created: true,
          point_distributions_created: true,
          monthly_payouts_created: true,
          admin_audit_log_created: true,
          existing_users_initialized: true
        }
      })
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Migration failed'
      })
    };
  }
};
