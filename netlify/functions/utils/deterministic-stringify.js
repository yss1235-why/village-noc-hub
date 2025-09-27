// netlify/functions/utils/deterministic-stringify.js
/**
 * Deterministic JSON serialization utility for cryptographic signature generation
 * Ensures consistent serialization order for voucher data integrity
 */

const sortObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj
      .map(sortObject)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  
  const sortedObj = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sortedObj[key] = sortObject(obj[key]);
    });
  
  return sortedObj;
};

export const deterministicStringify = (data) => {
  try {
    if (data === null || data === undefined) {
      return 'null';
    }
    
    if (typeof data !== 'object') {
      return JSON.stringify(data);
    }
    
    const sortedData = sortObject(data);
    return JSON.stringify(sortedData, null, 0);
    
  } catch (error) {
    throw new Error(`Deterministic serialization failed: ${error.message}`);
  }
};

export const validateSerialization = (data) => {
  try {
    const result1 = deterministicStringify(data);
    const result2 = deterministicStringify(data);
    return result1 === result2;
  } catch (error) {
    return false;
  }
};
