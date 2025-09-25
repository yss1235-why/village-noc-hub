import { neon } from '@neondatabase/serverless';
import { requireMinimumRole } from './utils/auth-middleware.js';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  const authResult = requireMinimumRole(event, 'village_admin');
  if (!authResult.isValid) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ error: authResult.error })
    };
  }

  try {
    const { targetType, targetId, title, content, priority, senderId } = JSON.parse(event.body);

    if (!title || !content || !targetType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title, content, and target type are required' })
      };
    }

    if (!['village', 'user', 'all_villages', 'all_users'].includes(targetType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid target type' })
      };
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const messagePriority = validPriorities.includes(priority) ? priority : 'normal';

    // Create the message record
    const messageResult = await sql`
      INSERT INTO admin_messages (
        sender_id, sender_role, target_type, target_id, title, content, 
        priority, status, created_at, updated_at
      ) VALUES (
        ${authResult.user.userId}, ${authResult.user.role}, ${targetType}, ${targetId || null},
        ${title}, ${content}, ${messagePriority}, 'sent', NOW(), NOW()
      ) RETURNING id, created_at
    `;

    const messageId = messageResult[0].id;

    // Create message recipients based on target type
    let recipientQuery;
    let recipients = [];

    switch (targetType) {
      case 'village':
        if (!targetId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Target village ID is required' })
          };
        }
        
        recipients = await sql`
          SELECT u.id, u.email, u.name, 'village_admin' as recipient_role
          FROM users u
          WHERE u.village_id = ${targetId} AND u.role = 'village_admin' AND u.is_active = true
        `;
        break;

      case 'user':
        if (!targetId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Target user ID is required' })
          };
        }
        
        recipients = await sql`
          SELECT u.id, u.email, u.name, u.role as recipient_role
          FROM users u
          WHERE u.id = ${targetId} AND u.is_active = true
        `;
        break;

      case 'all_villages':
        // Only system admin and super admin can message all villages
        if (!['admin', 'super_admin'].includes(authResult.user.role)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Insufficient permissions to message all villages' })
          };
        }
        
        recipients = await sql`
          SELECT u.id, u.email, u.name, 'village_admin' as recipient_role
          FROM users u
          WHERE u.role = 'village_admin' AND u.is_active = true
        `;
        break;

      case 'all_users':
        // Only system admin and super admin can message all users
        if (!['admin', 'super_admin'].includes(authResult.user.role)) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Insufficient permissions to message all users' })
          };
        }
        
        recipients = await sql`
          SELECT u.id, u.email, u.name, u.role as recipient_role
          FROM users u
          WHERE u.role IN ('user', 'applicant') AND u.is_active = true
          LIMIT 1000
        `;
        break;
    }

    // Create recipient records
    for (const recipient of recipients) {
      await sql`
        INSERT INTO message_recipients (
          message_id, recipient_id, recipient_email, recipient_name, 
          recipient_role, is_read, delivered_at, created_at
        ) VALUES (
          ${messageId}, ${recipient.id}, ${recipient.email}, ${recipient.name},
          ${recipient.recipient_role}, false, NOW(), NOW()
        )
      `;
    }

    // Update message with recipient count
    await sql`
      UPDATE admin_messages 
      SET recipient_count = ${recipients.length}
      WHERE id = ${messageId}
    `;

    // Log the messaging action
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, details, ip_address, created_at
      ) VALUES (
        ${authResult.user.userId}, 'SEND_MESSAGE', 'admin_message', ${messageId},
        ${JSON.stringify({
          targetType: targetType,
          targetId: targetId,
          title: title,
          priority: messagePriority,
          recipientCount: recipients.length
        })},
        ${event.headers['x-forwarded-for'] || 'unknown'},
        NOW()
      )
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        messageId: messageId,
        recipientCount: recipients.length,
        sentAt: messageResult[0].created_at
      })
    };

  } catch (error) {
    console.error('Send admin message error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send message' })
    };
  }
};
