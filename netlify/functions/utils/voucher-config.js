// netlify/functions/utils/voucher-config.js
export const validateVoucherConfig = () => {
  const signingKey = process.env.VOUCHER_SIGNING_KEY;
  
  if (!signingKey || signingKey.length < 32) {
    throw new Error('Missing required environment variable: VOUCHER_SIGNING_KEY (must be at least 32 characters)');
  }
  
  return {
    VOUCHER_SIGNING_KEY: signingKey
  };
};


