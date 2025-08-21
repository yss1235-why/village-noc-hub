import { sql } from './utils/db.js';

export const handler = async (event, context) => {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK (role IN ('super_admin', 'village_admin', 'applicant')),
        village_id UUID REFERENCES villages(id),
        is_approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create villages table
    await sql`
      CREATE TABLE IF NOT EXISTS villages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        pin_code VARCHAR(10) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        admin_email VARCHAR(255) NOT NULL,
        letterhead_url VARCHAR(500),
        signature_url VARCHAR(500),
        status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        approved_by UUID REFERENCES users(id)
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
        village_id UUID REFERENCES villages(id),
        purpose_of_noc TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        aadhaar_url VARCHAR(500),
        passport_url VARCHAR(500),
        status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'needs_edit')) DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by UUID REFERENCES users(id)
      )
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Database tables created successfully' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
