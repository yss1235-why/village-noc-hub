const { neon } = require('@neondatabase/serverless');
const { requireVillageAdmin } = require('./utils/auth-middleware.js');

exports.handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
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

    const { villageId } = event.queryStringParameters || {};

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
      };
    }

    // Security check: Ensure admin can only access their own village documents
    if (authResult.user.villageId !== villageId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied - you can only view your own village documents' })
      };
    }

    // Get village documents from database (with proper UUID cast)
    const docs = await sql`
      SELECT document_type, document_data, file_name
      FROM village_documents 
      WHERE village_id = ${villageId}::uuid
    `;

    // Get certificate template (with proper UUID cast)
    const template = await sql`
      SELECT template
      FROM certificate_templates 
      WHERE village_id = ${villageId}::uuid
    `;

    // Format documents
    const documentsMap = {};
    docs.forEach(doc => {
      documentsMap[doc.document_type] = {
        data: doc.document_data,
        filename: doc.file_name
      };
    });

    const documents = {
      letterhead: documentsMap.letterhead || null,
      signature: documentsMap.signature || null,
      seal: documentsMap.seal || null,
      roundSeal: documentsMap.roundSeal || null,
      certificateTemplate: template[0]?.template || null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ documents })
    };

  } catch (error) {
    console.error('Get village documents error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load documents' })
    };
  }
};
