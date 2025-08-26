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
    const { applicationNumber } = event.queryStringParameters || {};

    if (!applicationNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          valid: false,
          error: 'Application number is required' 
        })
      };
    }
console.log('Searching for application:', applicationNumber);

// Get application data with village info
const application = await sql`
  SELECT 
    a.application_number,
    a.applicant_name,
    a.title,
    a.relation,
    a.tribe_name,
    a.religion,
    a.annual_income,
    a.status,
    a.approved_date,
    a.created_at,
    v.name as village_name,
    v.district,
    v.state,
    v.admin_name
  FROM noc_applications a
  JOIN villages v ON a.village_id::uuid = v.id
  WHERE a.application_number = ${applicationNumber}
  AND a.status = 'approved'
`;

    if (!application.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: false,
          message: 'Certificate not found or not approved'
        })
      };
    }

    const app = application[0];

   // Use relation field as-is (whatever was entered in the form)
let relationString = app.relation || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        certificate: {
          applicationNumber: app.application_number,
          applicantName: app.applicant_name,
          title: app.title,
          relation: relationString,
          tribe: app.tribe_name,
          religion: app.religion,
          annualIncome: app.annual_income,
          villageName: app.village_name,
          district: app.district,
          state: app.state,
          adminName: app.admin_name,
          approvedDate: app.approved_date,
          issueDate: app.created_at
        }
      })
    };

  } catch (error) {
    console.error('Certificate verification error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        valid: false,
        error: 'Failed to verify certificate',
        details: error.message  // Add this line to see actual error
      })
    };
  }
};
