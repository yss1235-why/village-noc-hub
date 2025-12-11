import { neon } from '@neondatabase/serverless';
import { requireVillageAdmin } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'DELETE') {
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

    const { villageId, documentType } = JSON.parse(event.body);

    if (!villageId || !documentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and document type are required' })
      };
    }

    // Security check: Ensure admin can only delete their own village documents
    if (authResult.user.villageId !== villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied - you can only delete your own village documents' })
      };
    }

    // Validate document type
    const allowedDocumentTypes = ['letterhead', 'signature', 'seal', 'roundSeal'];
    if (!allowedDocumentTypes.includes(documentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document type' })
      };
    }

    // Delete the document
    const result = await sql`
      DELETE FROM village_documents 
      WHERE village_id = ${villageId}::uuid AND document_type = ${documentType}
      RETURNING document_type
    `;

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `${documentType} has been deleted successfully` 
      })
    };

  } catch (error) {
    console.error('Delete village document error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete document' })
    };
  }
};
