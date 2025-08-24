import { sql } from './utils/db.js';

export const handler = async (event, context) => {
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
    // Parse multipart form data manually (simplified approach)
    const body = event.body;
    const isBase64 = event.isBase64Encoded;
    
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data received' })
      };
    }

    // For this simplified implementation, we'll extract villageId and documentType from headers
    // In a real implementation, you'd properly parse multipart form data
    const villageId = event.headers['x-village-id'] || event.queryStringParameters?.villageId;
    const documentType = event.headers['x-document-type'] || event.queryStringParameters?.documentType;

    if (!villageId || !documentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and document type are required' })
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

    // Get the actual uploaded file data from the request body
    const requestData = JSON.parse(body);
    const uploadedBase64 = requestData.document;
    
    if (!uploadedBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data received' })
      };
    }
    
    // Insert or update document with the actual uploaded file
    await sql`
      INSERT INTO village_documents (village_id, document_type, document_data, file_name)
      VALUES (${villageId}, ${documentType}, ${uploadedBase64}, ${documentType + '.png'})
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
