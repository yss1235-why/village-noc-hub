import { verifyToken } from './jwt.js';

export const authenticateUser = (event) => {
  // Prioritize Authorization header to match frontend implementation
  const authHeader = event.headers.authorization;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Fallback to cookie if Authorization header not present
  if (!token) {
    const cookies = event.headers.cookie || '';
    const authTokenMatch = cookies.match(/auth-token=([^;]+)/);
    token = authTokenMatch ? authTokenMatch[1] : null;
  }
  
  if (!token) {
    return {
      isValid: false,
      error: 'No authentication token provided',
      statusCode: 401
    };
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      isValid: false,
      error: 'Invalid or expired token',
      statusCode: 401
    };
  }
  
  return {
    isValid: true,
    user: decoded
  };
};

export const requireSuperAdmin = (event) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role !== 'super_admin') {
    return {
      isValid: false,
      error: 'Super admin access required',
      statusCode: 403
    };
  }
  
  return authResult;
};

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  'super_admin': 4,
  'admin': 3,
  'village_admin': 2,
  'user': 1,
  'applicant': 1
};

// New admin role authentication
export const requireAdmin = (event) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role !== 'admin') {
    return {
      isValid: false,
      error: 'Admin access required',
      statusCode: 403
    };
  }
  
  return authResult;
};

// Flexible role-based authentication
export const requireRole = (event, requiredRole) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  const userRoleLevel = ROLE_HIERARCHY[authResult.user.role] || 0;
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 1;
  
  if (userRoleLevel < requiredRoleLevel) {
    return {
      isValid: false,
      error: `Insufficient permissions. Required: ${requiredRole}, Current: ${authResult.user.role}`,
      statusCode: 403
    };
  }
  
  return authResult;
};

// Check if user has specific permission
export const hasPermission = (userRole, action) => {
  const permissions = {
    'super_admin': {
      'create_admin': true,
      'manage_admin': true,
      'delete_admin': true,
      'approve_village': true,
      'delete_village': true,
      'system_settings': true,
      'view_audit': true,
      'manage_fraud': true,
      'broadcast_message': true,
      'manual_backup': true,
      'view_all_analytics': true
    },
    'admin': {
      'approve_user': true,
      'manage_points': true,
      'view_applications': true,
      'fraud_monitoring': true,
      'send_message': true,
      'view_analytics': true,
      'manage_certificates': true
    },
  'village_admin': {
  'approve_user': true,
  'view_applications': true,
  'village_analytics': true,
  'view_own_points': true
},
    'user': {
      'apply_certificate': true,
      'view_status': true
    },
    'applicant': {
      'apply_certificate': true,
      'view_status': true
    }
  };

  return permissions[userRole]?.[action] || false;
};

// Enhanced authentication with permission checking
export const requirePermission = (event, requiredPermission) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (!hasPermission(authResult.user.role, requiredPermission)) {
    return {
      isValid: false,
      error: `Permission denied. Required: ${requiredPermission}`,
      statusCode: 403
    };
  }
  
  return authResult;
};
// Shared function to get current user data from database
const getCurrentUserData = async (userId) => {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    
    const user = await sql`
      SELECT is_approved, point_balance 
      FROM users 
      WHERE id = ${userId}
    `;
    
    return user.length > 0 ? user[0] : null;
  } catch (error) {
    console.error('Error fetching current user data:', error);
    return null;
  }
};

export const requireApprovedUser = async (event) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  // For applicant role, check current approval status from database
  if (authResult.user.role === 'applicant') {
    const currentUserData = await getCurrentUserData(authResult.user.id);
    
    if (!currentUserData || !currentUserData.is_approved) {
      return {
        isValid: false,
        error: 'Account pending approval',
        statusCode: 403
      };
    }

    return {
      isValid: true,
      user: {
        ...authResult.user,
        isApproved: currentUserData.is_approved,
        pointBalance: currentUserData.point_balance || 0
      }
    };
  }
  
  return authResult;
};
export const requireMinimumPoints = async (event, minimumPoints = 15) => {
  const authResult = await requireApprovedUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role === 'applicant' && authResult.user.pointBalance < minimumPoints) {
    return {
      isValid: false,
      error: `Insufficient points. Required: ${minimumPoints}, Current: ${authResult.user.pointBalance}`,
      statusCode: 402 // Payment Required
    };
  }
  
  return authResult;
};
// Existing functions remain the same
export const authenticateAdmin = (event) => {
  return authenticateUser(event);
};

export const requireVillageAdmin = (event, requiredVillageId = null) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role !== 'village_admin') {
    return {
      isValid: false,
      error: 'Village admin access required',
      statusCode: 403
    };
  }
  
  // Check village-specific authorization if required
  if (requiredVillageId && authResult.user.villageId !== requiredVillageId) {
    return {
      isValid: false,
      error: 'Access denied - you can only access your village data',
      statusCode: 403
    };
  }
  
  return authResult;
};

// New system admin authentication
export const requireSystemAdmin = (event) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role !== 'admin') {
    return {
      isValid: false,
      error: 'System admin access required',
      statusCode: 403
    };
  }
  
  return authResult;
};

// Enhanced role checking for multi-tier system
export const requireMinimumRole = (event, minimumRole) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  const roleHierarchy = {
    'user': 1,
    'applicant': 1,
    'village_admin': 2,
    'admin': 3,
    'super_admin': 4
  };
  
  const userLevel = roleHierarchy[authResult.user.role] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;
  
  if (userLevel < requiredLevel) {
    return {
      isValid: false,
      error: `Insufficient permissions. Required: ${minimumRole}, Current: ${authResult.user.role}`,
      statusCode: 403
    };
  }
  
  return authResult;
};
