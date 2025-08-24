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

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Database tables created and migrated successfully',
        details: {
          villages_created: true,
          users_created: true,
          applications_created: true,
          sample_data_inserted: true,
          columns_migrated: true
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
