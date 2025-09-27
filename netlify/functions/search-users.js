import { neon } from '@neondatabase/serverless';
import { requireRole } from './utils/auth-middleware.js';

export const handler = async (event, context) => {
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
    // Verify admin or higher privileges for user search
    const authResult = requireRole(event, 'admin');
    if (!authResult.isValid) {
      return {
        statusCode: authResult.statusCode,
        headers,
        body: JSON.stringify({ error: authResult.error })
      };
    }

    const { q: searchQuery, roles, approved, limit = 20 } = event.queryStringParameters || {};

    if (!searchQuery || searchQuery.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search query must be at least 2 characters' })
      };
    }

    // Parse and validate roles parameter
    let allowedRoles = ['user', 'applicant']; // Default roles for voucher system
    if (roles) {
      const requestedRoles = roles.split(',').map(r => r.trim());
      const validRoles = ['user', 'applicant', 'village_admin', 'admin', 'super_admin'];
      allowedRoles = requestedRoles.filter(role => validRoles.includes(role));
      
      if (allowedRoles.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid roles specified' })
        };
      }
    }

    // Build search query with template literal syntax for Neon compatibility
const searchTerm = `%${searchQuery.toLowerCase()}%`;
const limitValue = parseInt(limit);

let users;

// Check if approval filter is specified
const hasApprovalFilter = approved === 'true' || approved === 'false';
const approvalValue = approved === 'true';

if (hasApprovalFilter) {
  users = await sql`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.full_name as "fullName",
      u.role,
      u.is_approved as "isApproved",
      u.point_balance as "pointBalance",
      v.name as "villageName"
    FROM users u
    LEFT JOIN villages v ON u.village_id = v.id
    WHERE u.role = ANY(${allowedRoles})
    AND (
      LOWER(u.username) LIKE ${searchTerm} OR
      LOWER(u.email) LIKE ${searchTerm} OR
      LOWER(u.full_name) LIKE ${searchTerm}
    )
    AND u.is_approved = ${approvalValue}
    ORDER BY 
      CASE WHEN u.is_approved THEN 0 ELSE 1 END,
      u.username ASC 
    LIMIT ${limitValue}
  `;
} else {
  users = await sql`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.full_name as "fullName",
      u.role,
      u.is_approved as "isApproved",
      u.point_balance as "pointBalance",
      v.name as "villageName"
    FROM users u
    LEFT JOIN villages v ON u.village_id = v.id
    WHERE u.role = ANY(${allowedRoles})
    AND (
      LOWER(u.username) LIKE ${searchTerm} OR
      LOWER(u.email) LIKE ${searchTerm} OR
      LOWER(u.full_name) LIKE ${searchTerm}
    )
    ORDER BY 
      CASE WHEN u.is_approved THEN 0 ELSE 1 END,
      u.username ASC 
    LIMIT ${limitValue}
  `;
}
    // Format results for frontend consumption
   const formattedUsers = users.map(user => ({
  id: user.id,
  username: user.username || user.email,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isApproved: user.isApproved,
  pointBalance: user.pointBalance || 0,
  villageName: user.villageName
}));

    // Log search activity for audit purposes
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, details, ip_address, user_agent
      )
      VALUES (
        ${authResult.user.id}, 'USER_SEARCH', 'users',
        ${JSON.stringify({
          searchQuery: searchQuery.substring(0, 50), // Limit logged query length
          roles: allowedRoles,
          resultCount: formattedUsers.length,
          searcherRole: authResult.user.role
        })},
        ${event.headers['x-forwarded-for'] || 'unknown'}::inet,
        ${event.headers['user-agent'] || 'unknown'}
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: formattedUsers,
        totalResults: formattedUsers.length,
        searchQuery,
        roles: allowedRoles
      })
    };

  } catch (error) {
    console.error('User search error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'User search failed. Please try again.' })
    };
  }
};
