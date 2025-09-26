import { verifyToken } from './jwt.js';

export const authenticateUser = (event) => {
  // Try to get token from cookie first, then from Authorization header
  const cookies = event.headers.cookie || '';
  const authTokenMatch = cookies.match(/auth-token=([^;]+)/);
  let token = authTokenMatch ? authTokenMatch[1] : null;
  
  // Fallback to Authorization header
  if (!token) {
    const authHeader = event.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
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
export const requireApprovedUser = async (event) => {
  // Use validate-token to get current user data (including updated approval status)
  try {
    // Get the token from the request
    const cookies = event.headers.cookie || '';
    const authTokenMatch = cookies.match(/auth-token=([^;]+)/);
    let token = authTokenMatch ? authTokenMatch[1] : null;
    
    if (!token) {
      const authHeader = event.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return {
        isValid: false,
        error: 'No authentication token provided',
        statusCode: 401
      };
    }

    // Call validate-token internally to get current user data
    const validateResponse = await fetch(`${process.env.URL || 'https://iramm.netlify.app'}/.netlify/functions/validate-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!validateResponse.ok) {
      return {
        isValid: false,
        error: 'Token validation failed',
        statusCode: 401
      };
    }

    const validateData = await validateResponse.json();
    
    if (!validateData.success) {
      return {
        isValid: false,
        error: validateData.error || 'Token validation failed',
        statusCode: 401
      };
    }

    const currentUser = validateData.user;

    // Check approval status using current data from validate-token
    if (currentUser.role === 'applicant' && !currentUser.isApproved) {
      return {
        isValid: false,
        error: 'Account pending approval',
        statusCode: 403
      };
    }

    return {
      isValid: true,
      user: currentUser
    };

  } catch (error) {
    console.error('Error in requireApprovedUser:', error);
    return {
      isValid: false,
      error: 'Authentication failed',
      statusCode: 500
    };
  }
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
