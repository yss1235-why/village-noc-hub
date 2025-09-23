import { verifyToken } from './jwt.js';

export const authenticateAdmin = (event) => {
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

export const requireVillageAdmin = (event, requiredVillageId = null) => {
  const authResult = authenticateAdmin(event);
  
  if (!authResult.isValid) {
    return authResult;
  }
  
  if (authResult.user.role !== 'village_admin') {
    return {
      isValid: false,
      error: 'Insufficient permissions - village admin required',
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
