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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_number VARCHAR(50) UNIQUE NOT NULL,
        applicant_name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        village_id UUID,
        purpose_of_noc TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        aadhaar_url VARCHAR(500),
        passport_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by UUID,
        CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_edit'))
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

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Database tables created successfully',
        details: {
          villages_created: true,
          users_created: true,
          applications_created: true,
          sample_data_inserted: true
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
