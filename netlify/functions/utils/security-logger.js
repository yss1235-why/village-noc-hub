// netlify/functions/utils/security-logger.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const logSecurityEvent = async (action, details, userId = null, event = null) => {
  try {
    const ipAddress = event?.headers?.['x-forwarded-for'] 
      ? event.headers['x-forwarded-for'].split(',')[0].trim() 
      : 'unknown';
    
    const userAgent = event?.headers?.['user-agent'] || 'unknown';
    
    await sql`
      INSERT INTO security_logs (
        user_id, action, details, ip_address, user_agent, created_at
      )
      VALUES (
        ${userId}, ${action}, ${JSON.stringify(details)}, 
        ${ipAddress}, ${userAgent}, NOW()
      )
    `;
  } catch (error) {
    console.error('Security logging failed:', error);
  }
};

export const logVoucherSecurityEvent = async (eventType, voucherData, userId, event) => {
  const securityDetails = {
    eventType,
    voucherCode: voucherData.voucherCode || voucherData.voucher_code,
    targetUserId: voucherData.targetUserId || voucherData.target_user_id,
    pointValue: voucherData.pointValue || voucherData.point_value,
    timestamp: new Date().toISOString()
  };
  
  await logSecurityEvent(`VOUCHER_${eventType}`, securityDetails, userId, event);
};
