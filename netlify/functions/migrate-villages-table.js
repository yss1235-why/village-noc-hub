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
    // Add missing columns to villages table if they don't exist
    await sql`
      ALTER TABLE villages 
      ADD COLUMN IF NOT EXISTS post_office VARCHAR(100),
      ADD COLUMN IF NOT EXISTS police_station VARCHAR(100),
      ADD COLUMN IF NOT EXISTS sub_division VARCHAR(100)
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Villages table migrated successfully with new columns' 
      })
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to migrate villages table',
        details: error.message 
      })
    };
  }
};
