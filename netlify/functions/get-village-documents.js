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

    // Get village documents - for now return null/default values
    // In a real implementation, you'd fetch from a documents table
    const documents = {
      letterhead: null,
      signature: null, 
      seal: null,
      roundSeal: null,
      certificateTemplate: `No Objection Certificate.
This is to certify that
{{TITLE}}
{{APPLICANT_NAME}}
{{RELATION}}
{{FATHER_NAME}}
is an inhabitant of House no.
{{HOUSE_NUMBER}},
{{VILLAGE_NAME}} Village, Under
Post Office {{POST_OFFICE}}, Police Station {{POLICE_STATION}}
Sub-division {{SUB_DIVISION}},
{{DISTRICT}} Dist
{{STATE}} - {{PIN_CODE}}.
He/She belongs to {{TRIBE_NAME}} Tribe,
{{RELIGION}} Religion by faith.
He/She is a citizen of the {{VILLAGE_NAME}} Village by Birth.
As per the family data collected by the Village his/her annual income is
{{ANNUAL_INCOME_NUMBER}} in word {{ANNUAL_INCOME_WORDS}} only.
To the best of my knowledge and belief, He/She does not have any negative remarks in the Village record.
He/She is not related to me.

Date: {{ISSUE_DATE}}
Place: {{VILLAGE_NAME}}

{{ADMIN_NAME}}
Headman/Chairman
{{VILLAGE_NAME}}`
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(documents)
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
