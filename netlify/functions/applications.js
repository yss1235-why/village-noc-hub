import { neon } from '@neondatabase/serverless';

// SECURITY: CORS origin validation
const getAllowedOrigin = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  
  // Define allowed origins (replace with your actual domains)
  const allowedOrigins = [
    'https://irram.netlify.app',
    'https://irram.netlify.app',
    'https://irram.netlify.app',
    // Add your actual production and staging domains here
  ];
  
  // For development, allow localhost
  if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    );
  }
  
  // Check if the requesting origin is in the allowed list
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Default to the first allowed origin if origin is not provided or not allowed
  return allowedOrigins[0] || 'https://your-domain.com';
};

// SECURITY: Secure file processing with image conversion
const sharp = require('sharp');
const pdf2pic = require('pdf2pic');

const secureFileProcessing = async (base64Data) => {
  try {
    // Parse base64 data
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Basic size validation
    if (buffer.length < 100) {
      throw new Error('File appears to be corrupted or too small');
    }
    
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }
    
    // Detect file type
    const fileSignature = buffer.slice(0, 8).toString('hex').toUpperCase();
    let imageBuffer;
    
    if (fileSignature.startsWith('25504446')) {
      // PDF file - convert to image
      console.log('Processing PDF file...');
      const convert = pdf2pic.fromBuffer(buffer, {
        density: 150,           // High quality for text readability
        saveFilename: "page",
        format: "png",
        width: 1200,           // Good resolution for documents
        height: 1600
      });
      
      const result = await convert(1, { responseType: "buffer" });
      imageBuffer = result.buffer;
    } else if (fileSignature.startsWith('89504E47') || fileSignature.startsWith('FFD8FF')) {
      // Already an image (PNG or JPEG)
      imageBuffer = buffer;
    } else {
      throw new Error('Unsupported file format. Only PNG, JPEG, and PDF files are allowed.');
    }
    
  // Process image with Sharp - creates completely clean file
    const cleanImage = await sharp(imageBuffer)
      .png({
        compressionLevel: 6,    // Good compression
        palette: false          // Don't use palette (removes some metadata)
      })
      .resize(1200, 1600, {     // Standardize size
        fit: 'inside',          // Maintain aspect ratio
        withoutEnlargement: true // Don't upscale small images
      })
      .toBuffer();
    
    // Convert back to base64 for storage
    const cleanBase64 = `data:image/png;base64,${cleanImage.toString('base64')}`;
    
    console.log(`File processed successfully. Original: ${buffer.length} bytes, Clean: ${cleanImage.length} bytes`);
    
    return cleanBase64;
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`File processing failed: ${error.message}`);
  }
};
    
  

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
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
      
     // SECURITY: Process and clean uploaded documents  
      let cleanAadhaarDocument = null;
      let cleanPassportPhoto = null;
      
      if (aadhaarDocument) {
        try {
          cleanAadhaarDocument = await secureFileProcessing(aadhaarDocument);
          console.log('Aadhaar document processed successfully');
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Aadhaar document processing failed: ${error.message}` })
          };
        }
      }

      if (passportPhoto) {
        try {
          cleanPassportPhoto = await secureFileProcessing(passportPhoto);
          console.log('Passport photo processed successfully');
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Passport photo processing failed: ${error.message}` })
          };
        }
      }
      // Insert new NOC application
    const result = await sql`
        INSERT INTO noc_applications (
          application_number, title, applicant_name, relation, father_name, address, house_number,
          village_id, tribe_name, religion, annual_income, annual_income_words, purpose_of_noc, phone, email,
          aadhaar_document, passport_photo, status
       ) VALUES (
          ${applicationNumber}, ${title}, ${applicantName}, ${relation}, ${fatherName}, ${address}, ${houseNumber},
          ${villageId}, ${tribeName}, ${religion}, ${annualIncome}, ${annualIncomeWords}, ${purposeOfNOC}, ${phone}, ${email},
          ${cleanAadhaarDocument}, ${cleanPassportPhoto}, 'pending'
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
      const { applicationNumber } = event.queryStringParameters || {};
      
      if (applicationNumber) {
        // FIX: Use LEFT JOIN to handle missing villages and add better error handling
       const application = await sql`
          SELECT 
            a.id,  -- ADD THIS LINE
            a.application_number,
            a.applicant_name,
            a.status,
            a.created_at,
            a.approved_at,
            COALESCE(v.name, 'Village Not Found') as village_name
          FROM noc_applications a
          LEFT JOIN villages v ON a.village_id::uuid = v.id::uuid
          WHERE a.application_number = ${applicationNumber}
        `;
        
                            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                  application: application[0] ? {
                    id: application[0].id,  // Only for certificate download
                    application_number: application[0].application_number,
                    applicant_name: application[0].applicant_name,
                    status: application[0].status,
                    created_at: application[0].created_at,
                    approved_at: application[0].approved_at,
                    village_name: application[0].village_name
                    // SECURITY: Never expose sensitive data like phone, email, documents, address, income
                  } : null 
                })
              };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Application number is required' })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
