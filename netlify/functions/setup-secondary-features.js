import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    console.log('Setting up secondary features database tables...');

    // Create admin_messages table for messaging system
    await sql`
      CREATE TABLE IF NOT EXISTS admin_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id INTEGER,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'sent',
        recipient_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )
    `;

    // Create message_recipients table
    await sql`
      CREATE TABLE IF NOT EXISTS message_recipients (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        recipient_role VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (message_id) REFERENCES admin_messages(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      )
    `;

    // Create system_settings table for fraud detection configuration
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_category VARCHAR(100) NOT NULL,
        setting_name VARCHAR(100) NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_by INTEGER,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(setting_category, setting_name),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `;

    // Create security_logs table for fraud detection
    await sql`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Create audit_logs table for comprehensive system auditing
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Create point_transactions table for points management
    await sql`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        reference_id VARCHAR(100),
        created_by INTEGER,
        ip_address INET,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    // Create admin_permissions table for granular admin permissions
    await sql`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        permission_name VARCHAR(100) NOT NULL,
        granted BOOLEAN DEFAULT TRUE,
        granted_by INTEGER,
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE(user_id, permission_name)
      )
    `;

    // Insert default fraud detection settings
    await sql`
      INSERT INTO system_settings (setting_category, setting_name, setting_value, description, created_at)
      VALUES 
        ('fraud_detection', 'enabled', 'true', 'Enable fraud detection monitoring', NOW()),
        ('fraud_detection', 'alertThreshold', '5', 'Number of suspicious activities before alert', NOW()),
        ('fraud_detection', 'suspiciousLoginAttempts', '3', 'Failed login attempts threshold', NOW()),
        ('fraud_detection', 'maxDailyApplications', '10', 'Maximum applications per user per day', NOW()),
        ('fraud_detection', 'autoBlockEnabled', 'false', 'Automatically block suspicious users', NOW()),
        ('fraud_detection', 'emailAlertEnabled', 'true', 'Send email alerts for fraud detection', NOW())
      ON CONFLICT (setting_category, setting_name) DO NOTHING
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON admin_messages(sender_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_recipients_message ON message_recipients(message_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_recipients_recipient ON message_recipients(recipient_id, is_read)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_user_action ON security_logs(user_id, action, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id, granted)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(setting_category)`;

    console.log('Secondary features database setup completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Secondary features database tables created successfully',
        tables: [
          'admin_messages',
          'message_recipients', 
          'system_settings',
          'security_logs',
          'audit_logs',
          'point_transactions',
          'admin_permissions'
        ],
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Database setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to set up secondary features database',
        details: error.message
      })
    };
  }
};
