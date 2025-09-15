const { sql } = require('./utils/db.js');
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Create noc_applications table if it doesn't exist (with correct UUID type)
    await sql`
     CREATE TABLE IF NOT EXISTS noc_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(10),
        applicant_name VARCHAR(255) NOT NULL,
        relation VARCHAR(10),
        father_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        house_number VARCHAR(50),
        village_id UUID,
        tribe_name VARCHAR(100),
        religion VARCHAR(50),
        annual_income VARCHAR(20),
        annual_income_words TEXT,
        purpose_of_noc TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        aadhaar_document TEXT,
        passport_photo TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by UUID,
        CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected', 'needs_edit'))
      )
    `;

    // Add missing columns to existing table if they don't exist
    try {
     await sql`
        ALTER TABLE noc_applications 
        ADD COLUMN IF NOT EXISTS title VARCHAR(10),
        ADD COLUMN IF NOT EXISTS relation VARCHAR(10),
        ADD COLUMN IF NOT EXISTS house_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS tribe_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS religion VARCHAR(50),
        ADD COLUMN IF NOT EXISTS annual_income VARCHAR(20),
        ADD COLUMN IF NOT EXISTS annual_income_words TEXT,
        ADD COLUMN IF NOT EXISTS aadhaar_document TEXT,
        ADD COLUMN IF NOT EXISTS passport_photo TEXT
      `;
    } catch (error) {
      console.log('Columns might already exist:', error.message);
    }

    if (event.httpMethod === 'POST') {
      const { 
        applicationNumber, 
        title,
        applicantName, 
        relation,
        fatherName, 
        address, 
        houseNumber,
        villageId, 
        tribeName,
        religion,
        annualIncome,
        annualIncomeWords,
        purposeOfNOC, 
        phone, 
        email,
        aadhaarDocument,
        passportPhoto
      } = JSON.parse(event.body);
      
      // Insert new NOC application
    const result = await sql`
        INSERT INTO noc_applications (
          application_number, title, applicant_name, relation, father_name, address, house_number,
          village_id, tribe_name, religion, annual_income, annual_income_words, purpose_of_noc, phone, email,
          aadhaar_document, passport_photo, status
        ) VALUES (
          ${applicationNumber}, ${title}, ${applicantName}, ${relation}, ${fatherName}, ${address}, ${houseNumber},
          ${villageId}, ${tribeName}, ${religion}, ${annualIncome}, ${annualIncomeWords}, ${purposeOfNOC}, ${phone}, ${email},
          ${aadhaarDocument}, ${passportPhoto}, 'pending'
        )
        RETURNING id
      `;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id: result[0].id })
      };
    }

    if (event.httpMethod === 'GET') {
      const { applicationNumber } = event.queryStringParameters;
      
      if (applicationNumber) {
      // Get specific application by number
        const application = await sql`
          SELECT a.*, v.name as village_name 
          FROM noc_applications a
          JOIN villages v ON a.village_id = v.id
          WHERE a.application_number = ${applicationNumber}
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ application: application[0] || null })
        };
      }
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
