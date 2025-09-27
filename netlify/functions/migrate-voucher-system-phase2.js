import { neon } from '@neondatabase/serverless';
import { requireSuperAdmin } from './utils/auth-middleware.js';

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

  try {
    const authResult = requireSuperAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    console.log('Starting Phase 2 voucher system migration...');

    // Create voucher table
    await sql`
      CREATE TABLE IF NOT EXISTS vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_code VARCHAR(32) UNIQUE NOT NULL,
        target_user_id UUID NOT NULL REFERENCES users(id),
        point_value INTEGER NOT NULL CHECK (point_value >= 500),
        monetary_value DECIMAL(10,2) NOT NULL CHECK (monetary_value >= 500.00),
        generated_by UUID NOT NULL REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        redeemed_at TIMESTAMP WITH TIME ZONE NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        cryptographic_signature VARCHAR(512) NOT NULL,
        redemption_ip INET NULL,
        redemption_user_agent TEXT NULL,
        administrative_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create admin quota table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_voucher_quotas (
        admin_id UUID PRIMARY KEY REFERENCES users(id),
        active_voucher_count INTEGER DEFAULT 0 CHECK (active_voucher_count >= 0 AND active_voucher_count <= 5),
        total_generated INTEGER DEFAULT 0,
        last_generation_timestamp TIMESTAMP WITH TIME ZONE,
        quota_reset_date DATE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create security logs table
    await sql`
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create indexes individually
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(voucher_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_target_user ON vouchers(target_user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_expires ON vouchers(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_generated_by ON vouchers(generated_by)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_quotas_admin ON admin_voucher_quotas(admin_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action)`;

    // Get migration statistics
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM vouchers) as total_vouchers,
        (SELECT COUNT(*) FROM admin_voucher_quotas) as admin_quotas_initialized,
        (SELECT COUNT(*) FROM security_logs) as security_logs_count
    `;

    console.log('Phase 2 migration completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Phase 2 voucher system migration completed successfully',
        statistics: stats[0] || { 
          total_vouchers: 0, 
          admin_quotas_initialized: 0,
          security_logs_count: 0
        },
        details: {
          vouchers_table_created: true,
          admin_quotas_table_created: true,
          security_logs_table_created: true,
          indexes_created: true
        }
      })
    };

  } catch (error) {
    console.error('Phase 2 migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Phase 2 migration failed'
      })
    };
  }
};
