import { neon } from '@neondatabase/serverless';

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
    const { villageId, template } = JSON.parse(event.body);

   if (!villageId || !template || template.trim() === '') {
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Village ID and valid template content are required' })
  };
}

   // Create certificate_templates table if it doesn't exist  
    await sql`
      CREATE TABLE IF NOT EXISTS certificate_templates (
        id SERIAL PRIMARY KEY,
        village_id UUID NOT NULL UNIQUE,
        template TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Update certificate template
    await sql`
      INSERT INTO certificate_templates (village_id, template)
      VALUES (${villageId}, ${template})
      ON CONFLICT (village_id)
      DO UPDATE SET 
        template = EXCLUDED.template,
        updated_at = CURRENT_TIMESTAMP
    `;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Certificate template updated successfully' 
      })
    };

  } catch (error) {
    console.error('Update certificate template error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update certificate template' })
    };
  }
};
