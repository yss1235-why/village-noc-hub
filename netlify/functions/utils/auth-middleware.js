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

export const requireApprovedUser = (event) => {
  const authResult = authenticateUser(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role === 'applicant' && !authResult.user.isApproved) {
    return {
      isValid: false,
      error: 'Account pending approval',
      statusCode: 403
    };
  }
  
  return authResult;
};

export const requireMinimumPoints = (event, minimumPoints = 15) => {
  const authResult = requireApprovedUser(event);
  
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
