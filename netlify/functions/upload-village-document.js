import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
import { requireVillageAdmin } from './utils/auth-middleware.js';

// SECURITY: Process and sanitize uploaded images
const secureFileProcessing = async (base64Input) => {
  try {
    // Extract base64 data (remove data URL prefix if present)
    let base64Data = base64Input;
    if (base64Input.includes(',')) {
      base64Data = base64Input.split(',')[1];
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Process image with sharp to strip metadata and re-encode
    const cleanImage = await sharp(buffer)
      .png({ quality: 90 })  // Re-encode as PNG
      .toBuffer();
    
    // Convert back to base64 with proper data URL prefix
    const cleanBase64 = `data:image/png;base64,${cleanImage.toString('base64')}`;
    
    console.log(`Image processed securely. Original: ${buffer.length} bytes, Clean: ${cleanImage.length} bytes`);
    
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
    // Authenticate - require village admin
    const authResult = requireVillageAdmin(event);
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const body = event.body;
    
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No request body received' })
      };
    }

    // Parse JSON body - frontend sends villageId, documentType, documentData in body
    const requestData = JSON.parse(body);
    const { villageId, documentType, documentData, fileName } = requestData;

    if (!villageId || !documentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and document type are required' })
      };
    }

    // Security check: Ensure admin can only upload to their own village
    if (authResult.user.villageId !== villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied - you can only upload documents for your own village' })
      };
    }

    // SECURITY: Validate document type against allowed types
    const allowedDocumentTypes = ['letterhead', 'signature', 'seal', 'roundSeal'];
    if (!allowedDocumentTypes.includes(documentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document type' })
      };
    }

    // Get the uploaded base64 data
    const uploadedBase64 = documentData;
    
    if (!uploadedBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No document data received' })
      };
    }

    // SECURITY: Process and clean uploaded document
    let cleanDocument;
    try {
      cleanDocument = await secureFileProcessing(uploadedBase64);
      console.log('Village document processed successfully');
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Document processing failed: ${error.message}` })
      };
    }

    // Insert or update document with the actual uploaded file
    await sql`
      INSERT INTO village_documents (village_id, document_type, document_data, file_name)
      VALUES (${villageId}::uuid, ${documentType}, ${cleanDocument}, ${fileName || documentType + '.png'})
      ON CONFLICT (village_id, document_type) 
      DO UPDATE SET 
        document_data = EXCLUDED.document_data,
        file_name = EXCLUDED.file_name,
        uploaded_at = CURRENT_TIMESTAMP
    `;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Document uploaded successfully' 
      })
    };

  } catch (error) {
    console.error('Upload village document error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to upload document' })
    };
  }
};
