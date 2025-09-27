// netlify/functions/utils/voucher-config.js
export const validateVoucherConfig = () => {
  const requiredEnvVars = {
    VOUCHER_SIGNING_KEY: process.env.VOUCHER_SIGNING_KEY,
    VOUCHER_RATE_LIMIT_WINDOW: process.env.VOUCHER_RATE_LIMIT_WINDOW || '3600000', // 1 hour
    VOUCHER_RATE_LIMIT_MAX: process.env.VOUCHER_RATE_LIMIT_MAX || '5'
  };

  const missing = [];
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (key === 'VOUCHER_SIGNING_KEY' && (!value || value.length < 32)) {
      missing.push(`${key} (must be at least 32 characters)`);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing or invalid environment variables: ${missing.join(', ')}`);
  }

  return requiredEnvVars;
};

// Rate limiting utility
const rateLimitStore = new Map();

export const checkRateLimit = (identifier, maxRequests = 5, windowMs = 3600000) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, []);
  }
  
  const requests = rateLimitStore.get(identifier);
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(...validRequests) + windowMs
    };
  }
  
  validRequests.push(now);
  rateLimitStore.set(identifier, validRequests);
  
  return {
    allowed: true,
    remaining: maxRequests - validRequests.length,
    resetTime: now + windowMs
  };
};
