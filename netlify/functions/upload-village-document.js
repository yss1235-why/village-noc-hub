import { neon } from '@neondatabase/serverless';

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
      .png()                    // Convert to PNG (removes any embedded content)
      .resize(1200, 1600, {     // Standardize size
        fit: 'inside',          // Maintain aspect ratio
        withoutEnlargement: true // Don't upscale small images
      })
      .removeMetadata()         // Strip all EXIF and metadata
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
    const body = event.body;
    const isBase64 = event.isBase64Encoded;
    
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data received' })
      };
    }

    const villageId = event.headers['x-village-id'] || event.queryStringParameters?.villageId;
    const documentType = event.headers['x-document-type'] || event.queryStringParameters?.documentType;

    if (!villageId || !documentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and document type are required' })
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

    // Create village_documents table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS village_documents (
        id SERIAL PRIMARY KEY,
       village_id UUID NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        document_data TEXT,
        file_name VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(village_id, document_type)
      )
    `;

  const requestData = JSON.parse(body);
    const uploadedBase64 = requestData.document;
    
    if (!uploadedBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data received' })
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
     VALUES (${villageId}, ${documentType}, ${cleanDocument}, ${documentType + '.png'})
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
