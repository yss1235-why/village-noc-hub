import { neon } from '@neondatabase/serverless';

// SECURITY: File content validation function
const validateFileContent = (base64Data) => {
  try {
    // Remove data URL prefix if present
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    
    // Convert base64 to buffer for analysis
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Check minimum file size (empty or too small files are suspicious)
    if (buffer.length < 100) {
      return { isValid: false, error: 'File appears to be corrupted or too small' };
    }
    
    // Check maximum file size (10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }
    
    // Validate file signatures (magic numbers)
    const fileSignature = buffer.slice(0, 8).toString('hex').toUpperCase();
    
    // PNG signature: 89504E470D0A1A0A
    if (fileSignature.startsWith('89504E47')) {
      return validatePNGContent(buffer);
    }
    
    // JPEG signature: FFD8FF
    if (fileSignature.startsWith('FFD8FF')) {
      return validateJPEGContent(buffer);
    }
    
    // PDF signature: 25504446
    if (fileSignature.startsWith('25504446')) {
      return validatePDFContent(buffer);
    }
    
    return { isValid: false, error: 'Unsupported file format. Only PNG, JPEG, and PDF files are allowed.' };
    
  } catch (error) {
    return { isValid: false, error: 'File validation failed: corrupted or invalid file' };
  }
};

// SECURITY: PNG-specific validation
const validatePNGContent = (buffer) => {
  // Check PNG footer
  const pngFooter = buffer.slice(-8).toString('hex').toUpperCase();
  if (!pngFooter.includes('49454E44AE426082')) {
    return { isValid: false, error: 'Invalid PNG file: corrupted or tampered' };
  }
  
  // Check for suspicious patterns that might indicate embedded content
  const suspicious = checkForSuspiciousContent(buffer);
  if (!suspicious.isSafe) {
    return { isValid: false, error: suspicious.reason };
  }
  
  return { isValid: true };
};

// SECURITY: JPEG-specific validation
const validateJPEGContent = (buffer) => {
  // Check JPEG footer (FFD9)
  const jpegFooter = buffer.slice(-2).toString('hex').toUpperCase();
  if (jpegFooter !== 'FFD9') {
    return { isValid: false, error: 'Invalid JPEG file: corrupted or tampered' };
  }
  
  const suspicious = checkForSuspiciousContent(buffer);
  if (!suspicious.isSafe) {
    return { isValid: false, error: suspicious.reason };
  }
  
  return { isValid: true };
};

// SECURITY: PDF-specific validation
const validatePDFContent = (buffer) => {
  // Check PDF footer
  const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1000));
  if (!content.includes('%PDF-')) {
    return { isValid: false, error: 'Invalid PDF file format' };
  }
  
  // Check for JavaScript in PDF (security risk)
  const pdfContent = buffer.toString('ascii').toLowerCase();
  if (pdfContent.includes('/javascript') || pdfContent.includes('/js')) {
    return { isValid: false, error: 'PDF files with JavaScript are not allowed for security reasons' };
  }
  
  const suspicious = checkForSuspiciousContent(buffer);
  if (!suspicious.isSafe) {
    return { isValid: false, error: suspicious.reason };
  }
  
  return { isValid: true };
};

// SECURITY: Check for suspicious content patterns
const checkForSuspiciousContent = (buffer) => {
  const content = buffer.toString('ascii').toLowerCase();
  
  // Check for script tags or executable content
  const suspiciousPatterns = [
    '<script',
    'javascript:',
    'onload=',
    'onerror=',
    'eval(',
    'function(',
    '<?php',
    '<%',
    'cmd.exe',
    'powershell',
    '/bin/sh'
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (content.includes(pattern)) {
      return { 
        isSafe: false, 
        reason: 'File contains potentially malicious content and cannot be uploaded' 
      };
    }
  }
  
  // Check for unusually high entropy (might indicate encrypted malware)
  const entropy = calculateEntropy(buffer);
  if (entropy > 7.5) {
    return { 
      isSafe: false, 
      reason: 'File appears to contain encrypted or compressed data which is not allowed' 
    };
  }
  
  return { isSafe: true };
};

// SECURITY: Calculate Shannon entropy to detect encrypted content
const calculateEntropy = (buffer) => {
  const frequencies = new Array(256).fill(0);
  
  for (let i = 0; i < buffer.length; i++) {
    frequencies[buffer[i]]++;
  }
  
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const probability = frequencies[i] / buffer.length;
      entropy -= probability * Math.log2(probability);
    }
  }
  
  return entropy;
};

export const handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

 try {
    const body = event.body;
    const isBase64 = event.isBase64Encoded;
    
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data received' })
      };
    }

    const villageId = event.headers['x-village-id'] || event.queryStringParameters?.villageId;
    const documentType = event.headers['x-document-type'] || event.queryStringParameters?.documentType;

    if (!villageId || !documentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Village ID and document type are required' })
      };
    }

    // SECURITY: Validate document type against allowed types
    const allowedDocumentTypes = ['letterhead', 'signature', 'seal', 'roundSeal'];
    if (!allowedDocumentTypes.includes(documentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document type' })
      };
    }

    // Create village_documents table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS village_documents (
        id SERIAL PRIMARY KEY,
       village_id UUID NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        document_data TEXT,
        file_name VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(village_id, document_type)
      )
    `;

  const requestData = JSON.parse(body);
    const uploadedBase64 = requestData.document;
    
    if (!uploadedBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file data received' })
      };
    }

    // SECURITY: Validate file format and content
    const securityValidation = validateFileContent(uploadedBase64);
    if (!securityValidation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: securityValidation.error })
      };
    }

    // SECURITY: Additional file size validation
    const fileSizeInBytes = (uploadedBase64.length * 3) / 4; // Approximate base64 to bytes conversion
    const maxSizeInMB = 10;
    if (fileSizeInBytes > maxSizeInMB * 1024 * 1024) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `File size exceeds ${maxSizeInMB}MB limit` })
      };
    }
    
    // Insert or update document with the actual uploaded file
    await sql`
      INSERT INTO village_documents (village_id, document_type, document_data, file_name)
      VALUES (${villageId}, ${documentType}, ${uploadedBase64}, ${documentType + '.png'})
      ON CONFLICT (village_id, document_type) 
      DO UPDATE SET 
        document_data = EXCLUDED.document_data,
        file_name = EXCLUDED.file_name,
        uploaded_at = CURRENT_TIMESTAMP
    `;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Document uploaded successfully' 
      })
    };

  } catch (error) {
    console.error('Upload village document error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to upload document' })
    };
  }
};
