import { neon } from '@neondatabase/serverless';

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
    console.log('Setting up sub village admin tables...');

    // Create designation_types table
    await sql`
      CREATE TABLE IF NOT EXISTS designation_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('Created designation_types table');

    // Insert predefined designations
    await sql`
      INSERT INTO designation_types (name, display_order, is_active)
      VALUES 
        ('Chairman', 1, true),
        ('Vice-Chairman', 2, true),
        ('Secretary', 3, true),
        ('Village Authority', 4, true)
      ON CONFLICT (name) DO NOTHING
    `;
    console.log('Inserted predefined designations');

    // Create sub_village_admins table
    await sql`
      CREATE TABLE IF NOT EXISTS sub_village_admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        designation_id INTEGER NOT NULL REFERENCES designation_types(id),
        phone_number VARCHAR(20) NOT NULL,
        aadhaar_front_image TEXT NOT NULL,
        aadhaar_back_image TEXT NOT NULL,
        passport_photo TEXT NOT NULL,
        signature_image TEXT NOT NULL,
        seal_image TEXT NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        is_locked BOOLEAN DEFAULT false,
        failed_pin_attempts INTEGER DEFAULT 0,
        locked_at TIMESTAMP WITH TIME ZONE,
        consecutive_lockout_count INTEGER DEFAULT 0,
        pin_reset_required BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        UNIQUE(village_id, phone_number)
      )
    `;
    console.log('Created sub_village_admins table');

    // Create village_admin_audit_log table
    await sql`
      CREATE TABLE IF NOT EXISTS village_admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
        sub_village_admin_id UUID NOT NULL REFERENCES sub_village_admins(id),
        sub_village_admin_name VARCHAR(255) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        application_id UUID,
        application_number VARCHAR(50),
        applicant_name VARCHAR(255),
        ip_address VARCHAR(255),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('Created village_admin_audit_log table');

    // Add new columns to noc_applications for approval tracking
    try {
      await sql`
        ALTER TABLE noc_applications 
        ADD COLUMN IF NOT EXISTS approved_by_sub_admin_id UUID,
        ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS approved_by_designation VARCHAR(100)
      `;
      console.log('Added approval tracking columns to noc_applications');
    } catch (alterError) {
      console.log('Columns may already exist:', alterError.message);
    }

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_sub_village_admins_village ON sub_village_admins(village_id, is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sub_village_admins_primary ON sub_village_admins(village_id, is_primary) WHERE is_primary = true`;
    await sql`CREATE INDEX IF NOT EXISTS idx_village_admin_audit_log_village ON village_admin_audit_log(village_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_village_admin_audit_log_sub_admin ON village_admin_audit_log(sub_village_admin_id, created_at DESC)`;
    console.log('Created indexes');

    // Check if migration is needed (if any villages exist without sub_village_admins)
    const villagesWithoutSubAdmins = await sql`
      SELECT v.id, v.name, v.admin_name, v.admin_email
      FROM villages v
      LEFT JOIN sub_village_admins sva ON v.id = sva.village_id AND sva.is_primary = true
      WHERE v.status = 'approved' AND sva.id IS NULL
    `;

    console.log(`Found ${villagesWithoutSubAdmins.length} villages needing migration`);

    // Note: Primary village admins will need to set their PIN on first login
    // We don't migrate them here because we need their documents (signature, seal, etc.)
    // Instead, we flag them for setup completion

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Sub village admin tables created successfully',
        details: {
          tables_created: ['designation_types', 'sub_village_admins', 'village_admin_audit_log'],
          columns_added: ['approved_by_sub_admin_id', 'approved_by_name', 'approved_by_designation'],
          indexes_created: 4,
          villages_pending_setup: villagesWithoutSubAdmins.length,
          villages_pending_list: villagesWithoutSubAdmins.map(v => ({ id: v.id, name: v.name }))
        }
      })
    };

  } catch (error) {
    console.error('Setup sub village admins error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to setup sub village admin tables',
        details: error.message 
      })
    };
  }
};
