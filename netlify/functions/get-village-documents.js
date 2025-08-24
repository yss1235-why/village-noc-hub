import { sql } from './utils/db.js';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET',
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
    const { villageId } = event.queryStringParameters;

    if (!villageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID is required' })
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

    // Create certificate_templates table if it doesn't exist  
    await sql`
      CREATE TABLE IF NOT EXISTS certificate_templates (
        id SERIAL PRIMARY KEY,
        village_id VARCHAR(255) NOT NULL UNIQUE,
        template TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Get village documents from database
    const docs = await sql`
      SELECT document_type, document_data, file_name
      FROM village_documents 
      WHERE village_id = ${villageId}
    `;

    // Get certificate template
    const template = await sql`
      SELECT template
      FROM certificate_templates 
      WHERE village_id = ${villageId}
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
     certificateTemplate: template[0]?.template || `This is to certify that {{TITLE}} {{APPLICANT_NAME}} is an inhabitant of House no. {{HOUSE_NUMBER}}, {{VILLAGE_NAME}} Village, Under Post Office {{POST_OFFICE}}, Police Station {{POLICE_STATION}} Sub-division {{SUB_DIVISION}}, {{DISTRICT}} Dist {{STATE}} - {{PIN_CODE}}.

He/She belongs to {{TRIBE_NAME}} Tribe, {{RELIGION}} Religion by faith. He/She is a citizen of the {{VILLAGE_NAME}} Village by Birth. As per the family data collected by the Village his/her annual income is {{ANNUAL_INCOME_NUMBER}} in word {{ANNUAL_INCOME_WORDS}} only.

To the best of my knowledge and belief, He/She does not have any negative remarks in the Village record.

He/She is not related to me.`

Date: {{ISSUE_DATE}}
Place: {{VILLAGE_NAME}}

{{ADMIN_NAME}}
Headman/Chairman
{{VILLAGE_NAME}}`
    };

    return {
  statusCode: 200,
  headers,
  body: JSON.stringify({ documents }) // Wrap in documents object
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
