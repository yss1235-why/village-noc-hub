import jwt from 'jsonwebtoken';

// SECURITY FIX: Use environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// Check if JWT_SECRET exists - fail fast if missing
if (!JWT_SECRET) {
  throw new Error('❌ JWT_SECRET environment variable is required but not set. Please add it to your environment variables.');
}

// Make sure the secret is long enough to be secure
if (JWT_SECRET.length < 32) {
  throw new Error('❌ JWT_SECRET must be at least 32 characters long for security.');
}

console.log('✅ JWT_SECRET loaded successfully');

const JWT_EXPIRY = '24h'; // Token expires in 24 hours

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRY,
    issuer: 'noc-system',
    audience: 'noc-users'
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'noc-system',
      audience: 'noc-users'
    });
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
};

export const refreshToken = (token) => {
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  // Generate new token with same payload (minus exp, iat, etc.)
  const { exp, iat, ...payload } = decoded;
  return generateToken(payload);
};
