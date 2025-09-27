import { neon } from '@neondatabase/serverless';
import { requireSuperAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
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
    // Verify super admin privileges for schema changes
    const authResult = requireSuperAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    console.log('Starting Phase 2 voucher system migration...');

    await sql`BEGIN`;

    try {
      // 1. Create dedicated voucher table
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

      // 2. Create admin voucher quota tracking
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

      // 3. Create security logs table (if not exists)
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

     
     // 4. Add indexes for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(voucher_code)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_target_user ON vouchers(target_user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_expires ON vouchers(expires_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_generated_by ON vouchers(generated_by)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_admin_quotas_admin ON admin_voucher_quotas(admin_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action)`;
      `;

      // 5. Migrate existing voucher data from point_transactions
      await sql`
        INSERT INTO vouchers (
          voucher_code, target_user_id, point_value, monetary_value,
          generated_by, generated_at, expires_at, cryptographic_signature,
          administrative_notes, status
        )
        SELECT 
          pt.reference_id as voucher_code,
          pt.user_id as target_user_id,
          pt.amount as point_value,
          pt.amount as monetary_value,
          pt.created_by as generated_by,
          pt.created_at as generated_at,
          pt.created_at + INTERVAL '30 days' as expires_at,
          COALESCE(
            SUBSTRING(pt.description FROM 'Signature: ([^|]+)'),
            'migrated_legacy_voucher'
          ) as cryptographic_signature,
          pt.description as administrative_notes,
          CASE 
            WHEN redeemed.id IS NOT NULL THEN 'redeemed'
            WHEN pt.created_at < NOW() - INTERVAL '30 days' THEN 'expired'
            ELSE 'active'
          END as status
        FROM point_transactions pt
        LEFT JOIN point_transactions redeemed ON redeemed.reference_id = pt.reference_id 
          AND redeemed.transaction_type = 'voucher_redeemed'
        WHERE pt.transaction_type = 'voucher_generated'
        AND NOT EXISTS (
          SELECT 1 FROM vouchers v WHERE v.voucher_code = pt.reference_id
        )
      `;

      // 6. Initialize admin quotas
      await sql`
        INSERT INTO admin_voucher_quotas (admin_id, active_voucher_count, total_generated)
        SELECT 
          generated_by,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(*) as total_count
        FROM vouchers
        GROUP BY generated_by
        ON CONFLICT (admin_id) DO UPDATE SET
          active_voucher_count = EXCLUDED.active_voucher_count,
          total_generated = EXCLUDED.total_generated,
          updated_at = NOW()
      `;

      await sql`COMMIT`;

      // 7. Get migration statistics
      const stats = await sql`
        SELECT 
          (SELECT COUNT(*) FROM vouchers) as total_vouchers,
          (SELECT COUNT(*) FROM vouchers WHERE status = 'active') as active_vouchers,
          (SELECT COUNT(*) FROM vouchers WHERE status = 'redeemed') as redeemed_vouchers,
          (SELECT COUNT(*) FROM admin_voucher_quotas) as admin_quotas_initialized
      `;

      console.log('Phase 2 migration completed successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Phase 2 voucher system migration completed successfully',
          statistics: stats[0],
          details: {
            vouchers_table_created: true,
            admin_quotas_table_created: true,
            security_logs_table_created: true,
            indexes_created: true,
            existing_data_migrated: true,
            admin_quotas_initialized: true
          }
        })
      };

    } catch (transactionError) {
      await sql`ROLLBACK`;
      throw transactionError;
    }

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
