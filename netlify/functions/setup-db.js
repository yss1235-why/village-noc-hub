import { neon } from '@neondatabase/serverless';

export const handler = async (event, context) => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Create villages table first (no dependencies)
    await sql`
      CREATE TABLE IF NOT EXISTS villages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        district VARCHAR(50) NOT NULL,
        state VARCHAR(50) NOT NULL,
        pin_code VARCHAR(6) NOT NULL,
        post_office VARCHAR(100),
        police_station VARCHAR(100),
        sub_division VARCHAR(100),
        admin_name VARCHAR(100) NOT NULL,
        admin_email VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP
      )
    `;

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        village_id UUID,
        is_approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT role_check CHECK (role IN ('super_admin', 'village_admin', 'applicant'))
      )
    `;

    // Create NOC applications table
    await sql`
     CREATE TABLE IF NOT EXISTS noc_applications (
  id SERIAL PRIMARY KEY,
  application_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(10),
  applicant_name VARCHAR(100) NOT NULL,
  relation VARCHAR(10),
  father_name VARCHAR(100),
  address TEXT,
  house_number VARCHAR(50),
  village_id UUID REFERENCES villages(id),
  tribe_name VARCHAR(100),
  religion VARCHAR(50),
  annual_income VARCHAR(20),
  annual_income_words TEXT,
  purpose_of_noc TEXT,
  phone VARCHAR(15),
  email VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP
)
    `;

    // Insert sample approved villages (use INSERT ... ON CONFLICT DO NOTHING to avoid duplicates)
    const existingVillages = await sql`SELECT COUNT(*) as count FROM villages`;
    
    if (existingVillages[0].count === 0) {
      await sql`
        INSERT INTO villages (name, district, state, pin_code, admin_name, admin_email, status)
        VALUES 
          ('Zingsui Sambu Village', 'Kamjong', 'Manipur', '795145', 'Village Admin', 'admin@zingsui.com', 'approved'),
          ('Sample Village 2', 'Ukhrul', 'Manipur', '795142', 'Admin 2', 'admin@village2.com', 'approved')
      `;
    }

    // Create a super admin user if it doesn't exist
    const existingSuperAdmin = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'`;
    
    if (existingSuperAdmin[0].count === 0) {
      await sql`
        INSERT INTO users (email, password_hash, role, is_approved)
        VALUES ('superadmin@noc.com', '$2b$10$placeholder_hash', 'super_admin', true)
      `;
    }

   // Add missing columns to villages table if they don't exist
    try {
      await sql`
        ALTER TABLE villages 
        ADD COLUMN IF NOT EXISTS post_office VARCHAR(100),
        ADD COLUMN IF NOT EXISTS police_station VARCHAR(100),
        ADD COLUMN IF NOT EXISTS sub_division VARCHAR(100)
      `;
      console.log('Added missing columns to villages table');
    } catch (error) {
      console.log('Columns might already exist or other error:', error.message);
    }

    // Update users table to support additional roles and features
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS point_balance INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `;
      
      // Update role constraint to include admin role
      await sql`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS role_check
      `;
      
      await sql`
        ALTER TABLE users ADD CONSTRAINT role_check 
        CHECK (role IN ('super_admin', 'admin', 'village_admin', 'user', 'applicant'))
      `;
      
      console.log('Enhanced users table with additional columns and roles');
    } catch (error) {
      console.log('User table enhancement error:', error.message);
    }

    // Create alias view for applications table compatibility
    await sql`
      CREATE OR REPLACE VIEW applications AS 
      SELECT 
        id,
        application_number,
        applicant_name,
        father_name,
        address,
        village_id,
        purpose_of_noc,
        phone,
        email,
        status,
        created_at,
        approved_at,
        title,
        relation,
        house_number,
        tribe_name,
        religion,
        annual_income,
        annual_income_words
      FROM noc_applications
    `;

    console.log('Core tables setup completed, setting up secondary features...');

    // Create admin_messages table for messaging system
    await sql`
      CREATE TABLE IF NOT EXISTS admin_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id UUID,
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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL,
        recipient_id UUID NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255) NOT NULL,
        recipient_role VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (message_id) REFERENCES admin_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Create system_settings table for configuration management
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_category VARCHAR(100) NOT NULL,
        setting_name VARCHAR(100) NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_by UUID,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(setting_category, setting_name),
        FOREIGN KEY (updated_by) REFERENCES users(id)
      )
    `;

    // Create security_logs table for fraud detection
    await sql`
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    // Create audit_logs table for comprehensive system auditing
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    // Create point_transactions table for points management
    await sql`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        reference_id VARCHAR(100),
        created_by UUID,
        ip_address INET,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    // Create admin_permissions table for granular admin permissions
    await sql`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        permission_name VARCHAR(100) NOT NULL,
        granted BOOLEAN DEFAULT TRUE,
        granted_by UUID,
        granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(user_id, permission_name)
      )
    `;

    console.log('Secondary features tables created successfully');

    // Insert default system settings
    await sql`
      INSERT INTO system_settings (setting_category, setting_name, setting_value, description, created_at)
      VALUES 
        ('fraud_detection', 'enabled', 'true', 'Enable fraud detection monitoring', NOW()),
        ('fraud_detection', 'alertThreshold', '5', 'Number of suspicious activities before alert', NOW()),
        ('fraud_detection', 'suspiciousLoginAttempts', '3', 'Failed login attempts threshold', NOW()),
        ('fraud_detection', 'maxDailyApplications', '10', 'Maximum applications per user per day', NOW()),
        ('fraud_detection', 'autoBlockEnabled', 'false', 'Automatically block suspicious users', NOW()),
        ('fraud_detection', 'emailAlertEnabled', 'true', 'Send email alerts for fraud detection', NOW()),
        ('system', 'maintenanceMode', 'false', 'Enable maintenance mode', NOW()),
        ('system', 'registrationEnabled', 'true', 'Allow new user registrations', NOW()),
        ('points', 'welcomeBonus', '50', 'Points awarded on user approval', NOW()),
        ('points', 'applicationCost', '15', 'Points deducted per application', NOW())
      ON CONFLICT (setting_category, setting_name) DO NOTHING
    `;

    console.log('Default system settings inserted successfully');

    // Create performance indexes for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, is_approved, is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_village ON users(village_id) WHERE village_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_noc_applications_village ON noc_applications(village_id, status, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_noc_applications_status ON noc_applications(status, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_villages_status ON villages(status, created_at)`;
    
    // Secondary features indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON admin_messages(sender_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_messages_target ON admin_messages(target_type, target_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_recipients_message ON message_recipients(message_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_message_recipients_recipient ON message_recipients(recipient_id, is_read)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_user_action ON security_logs(user_id, action, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_security_logs_action_time ON security_logs(action, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id, granted)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(setting_category, setting_name)`;

    console.log('Performance indexes created successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Complete database setup with secondary features completed successfully',
        details: {
          core_tables: ['villages', 'users', 'noc_applications'],
          secondary_tables: ['admin_messages', 'message_recipients', 'system_settings', 'security_logs', 'audit_logs', 'point_transactions', 'admin_permissions'],
          enhancements: ['user_table_columns', 'role_constraints', 'applications_view'],
          indexes_created: 19,
          default_settings_count: 10,
          sample_data_inserted: true,
          timestamp: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    console.error('Database setup error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        details: 'Failed to create database tables'
      })
    };
  }
};
