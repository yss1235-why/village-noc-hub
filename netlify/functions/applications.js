import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { requireMinimumPoints } from './utils/auth-middleware.js';
import sharp from 'sharp';
import pdf2pic from 'pdf2pic';

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
      // PDF file - now rejected
      throw new Error('PDF files are not supported. Please upload JPG or PNG only.');
    } else if (fileSignature.startsWith('89504E47') || fileSignature.startsWith('FFD8FF')) {
      // Already an image (PNG or JPEG)
      imageBuffer = buffer;
    } else {
     throw new Error('Unsupported file format. Only PNG and JPEG files are allowed.');
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
   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        user_id UUID REFERENCES users(id),
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
        ADD COLUMN IF NOT EXISTS passport_photo TEXT,
        ADD COLUMN IF NOT EXISTS child_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS ward_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS husband_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS mother_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(200)
      `;
    } catch (error) {
      console.log('Columns might already exist:', error.message);
    }

   if (event.httpMethod === 'POST') {
      // Check authentication and points BEFORE processing
     const authResult = await requireMinimumPoints(event, 15);
      if (!authResult.isValid) {
        return {
          statusCode: authResult.statusCode,
          headers,
          body: JSON.stringify({ error: authResult.error })
        };
      }

      const userInfo = authResult.user;
      
     const { 
        applicationNumber, 
        title,
        applicantName,
        relation,
        fatherName,
        husbandName,
        motherName,
        guardianName,
        childName,
        wardName,
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
      // Start database transaction for application + point deduction
      await sql`BEGIN`;
      
      try {
        // Generate application number if not provided
        let finalApplicationNumber = applicationNumber;
        if (!finalApplicationNumber) {
          const maxNumber = await sql`
            SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM '[0-9]+') AS INTEGER)), 0) as max_num
            FROM noc_applications 
            WHERE application_number ~ '^NOC[0-9]+$'
          `;
          const nextNumber = (maxNumber[0]?.max_num || 0) + 1;
          finalApplicationNumber = `NOC${nextNumber.toString().padStart(6, '0')}`;
        }

        // Insert new NOC application with user_id
     const result = await sql`
          INSERT INTO noc_applications (
            application_number, user_id, title, applicant_name, relation, father_name, husband_name, mother_name, 
            guardian_name, child_name, ward_name, address, house_number, village_id, tribe_name, religion, 
            annual_income, annual_income_words, purpose_of_noc, phone, email, aadhaar_document, passport_photo, status
          ) VALUES (
            ${finalApplicationNumber}, ${userInfo.id}, ${title}, ${applicantName}, ${relation}, ${fatherName}, 
            ${husbandName}, ${motherName}, ${guardianName}, ${childName}, ${wardName}, ${address}, ${houseNumber},
            ${villageId}, ${tribeName}, ${religion}, ${annualIncome}, ${annualIncomeWords}, ${purposeOfNOC}, 
            ${phone}, ${email}, ${cleanAadhaarDocument}, ${cleanPassportPhoto}, 'pending'
          )
          RETURNING id, application_number
        `;

      const applicationId = result[0].id;

      // DEDUCT POINTS IMMEDIATELY
      const currentBalance = await sql`SELECT point_balance FROM users WHERE id = ${userInfo.id}`;
      
      if (currentBalance[0].point_balance < 15) {
        await sql`ROLLBACK`;
        return {
          statusCode: 402,
          headers,
          body: JSON.stringify({ error: 'Insufficient points for application' })
        };
      }

      const newBalance = currentBalance[0].point_balance - 15;

      // Create deduction transaction
      const transactionHash = crypto.createHash('sha256')
        .update(`${userInfo.id}-${applicationId}-${Date.now()}`)
        .digest('hex');

      await sql`
        INSERT INTO point_transactions (
          transaction_hash, user_id, type, amount, previous_balance, new_balance,
          application_id, reason, admin_ip
        )
        VALUES (
          ${transactionHash}, ${userInfo.id}, 'DEDUCT', -15, ${currentBalance[0].point_balance}, ${newBalance},
          ${applicationId}, 'NOC Application Fee', ${event.headers['x-forwarded-for'] || 'unknown'}
        )
      `;

      // Update user balance
      await sql`UPDATE users SET point_balance = ${newBalance} WHERE id = ${userInfo.id}`;

      // Create point distribution (5-5-5)
      // Village admin will receive their 5 points when they APPROVE the application
      await sql`
        INSERT INTO point_distributions (
          application_id, village_id, total_points,
          server_maintenance_points, super_admin_points, village_admin_points
        )
        VALUES (${applicationId}, ${villageId}, 15, 5, 5, 5)
      `;

      await sql`COMMIT`;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          success: true, 
          id: applicationId,
          applicationNumber: result[0].application_number,
          pointsDeducted: 15,
          newBalance: newBalance,
          message: 'Application submitted successfully'
        })
      };

      } catch (error) {
        await sql`ROLLBACK`;
        throw error;
      }
    }

if (event.httpMethod === 'GET') {
      const { applicationNumber } = event.queryStringParameters || {};
      
      if (applicationNumber) {
        // Public application status check - no auth required
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
        // Get user's own applications - requires authentication
        const authResult = await requireMinimumPoints(event, 0); // Just need to be authenticated
        if (!authResult.isValid) {
          return {
            statusCode: authResult.statusCode,
            headers,
            body: JSON.stringify({ error: authResult.error })
          };
        }

        const userInfo = authResult.user;
        
        // Return only user's own applications if regular user
        if (userInfo.role === 'applicant') {
          const applications = await sql`
            SELECT 
              id, application_number, applicant_name, status, 
              created_at, approved_at, purpose_of_noc
            FROM noc_applications 
            WHERE user_id = ${userInfo.id}
            ORDER BY created_at DESC
          `;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ applications })
          };
        }
        
        // Admin users see all applications
        const applications = await sql`
          SELECT 
            id, application_number, applicant_name, status, 
            created_at, approved_at, purpose_of_noc, user_id
          FROM noc_applications 
          ORDER BY created_at DESC
        `;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ applications })
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
