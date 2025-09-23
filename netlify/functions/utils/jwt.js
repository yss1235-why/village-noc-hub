import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-secret-key-change-in-production';
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
