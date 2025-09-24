import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
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
   const {
      full_name,
      aadhaar_number,
      aadhaar_document,
      passport_number,
      passport_photo,
      id_code,
      police_verification,
      address,
      username,
      password,
      email,
      phone,
      center_shop_name
    } = JSON.parse(event.body);
    // Validation
    if (!full_name || !aadhaar_number || !id_code || !address || !username || !password || !email || !phone || !center_shop_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'All required fields must be provided' })
      };
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE email = ${email} OR username = ${username} OR aadhaar_number = ${aadhaar_number}
    `;

    if (existingUser.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'User already exists with this email, username, or Aadhaar number' })
      };
    }

   // SECURITY: Process and clean uploaded documents
    let cleanAadhaarDocument = null;
    let cleanPassportPhoto = null;
    let cleanPoliceVerification = null;
    
    if (aadhaar_document) {
      try {
        cleanAadhaarDocument = await secureFileProcessing(aadhaar_document);
        console.log('Aadhaar document processed successfully');
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Aadhaar document processing failed: ${error.message}` })
        };
      }
    }

    if (passport_photo) {
      try {
        cleanPassportPhoto = await secureFileProcessing(passport_photo);
        console.log('Passport photo processed successfully');
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Passport photo processing failed: ${error.message}` })
        };
      }
    }

    if (police_verification) {
      try {
        cleanPoliceVerification = await secureFileProcessing(police_verification);
        console.log('Police verification document processed successfully');
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Police verification document processing failed: ${error.message}` })
        };
      }
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
// Create user with pending approval and processed documents
    const newUser = await sql`
      INSERT INTO users (
        full_name, aadhaar_number, aadhaar_document, passport_number, passport_photo,
        id_code, police_verification, address, username, password_hash, 
        email, phone, center_shop_name, role, is_approved, point_balance
      )
      VALUES (
        ${full_name}, ${aadhaar_number}, ${cleanAadhaarDocument}, ${passport_number}, ${cleanPassportPhoto},
        ${id_code}, ${cleanPoliceVerification}, ${address}, ${username}, ${password_hash},
        ${email}, ${phone}, ${center_shop_name}, 'applicant', false, 0
      )
      RETURNING id, username, email
    `;

   // Log registration in audit trail
      await sql`
        INSERT INTO admin_audit_log (admin_id, action, details, ip_address)
        VALUES (
          ${newUser[0].id}, 
          'USER_REGISTRATION', 
          ${JSON.stringify({ 
            username, 
            email, 
            documentsProcessed: {
              aadhaar: !!cleanAadhaarDocument,
              passport: !!cleanPassportPhoto,
              police: !!cleanPoliceVerification
            },
            registration_ip: event.headers['x-forwarded-for'] 
          })},
          ${event.headers['x-forwarded-for'] || 'unknown'}
        )
      `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Registration successful. Please wait for admin approval.',
        user: {
          id: newUser[0].id,
          username: newUser[0].username,
          email: newUser[0].email,
          status: 'pending_approval'
        }
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle unique constraint violations
    if (error.message.includes('unique')) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Username, email, or Aadhaar number already exists' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Registration failed. Please try again.' })
    };
  }
};
