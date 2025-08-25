const { sql } = require('./utils/db.js');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

 try {
    const { applicationId } = JSON.parse(event.body);
    console.log('1. Application ID:', applicationId);

    // Create tables if they don't exist
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

    await sql`
      CREATE TABLE IF NOT EXISTS certificate_templates (
        id SERIAL PRIMARY KEY,
        village_id UUID NOT NULL UNIQUE,
        template TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Get application data
  const application = await sql`
      SELECT a.*, v.name as village_name, v.district, v.state, v.pin_code, 
             v.admin_name, v.post_office, v.police_station, v.sub_division
      FROM noc_applications a
      JOIN villages v ON a.village_id::uuid = v.id
      WHERE a.id = ${applicationId} AND a.status = 'approved'
    `;
    console.log('2. Application found:', application.length > 0);

    if (!application.length) {
      console.log('3. No application found or not approved');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found or not approved' })
      };
    }

    const app = application[0];
console.log('4. Application data:', app.applicant_name);

// Ensure all relation fields are available
app.father_name = app.father_name || '';
app.mother_name = app.mother_name || '';
app.husband_name = app.husband_name || '';
app.guardian_name = app.guardian_name || '';

// Get village documents and template
const docs = await sql`
      SELECT document_type, document_data, file_name
      FROM village_documents 
      WHERE village_id = ${app.village_id}
    `;
    console.log('5. Documents found:', docs.length);

    const template = await sql`
      SELECT template FROM certificate_templates 
      WHERE village_id = ${app.village_id}
    `;
    console.log('6. Template found:', template.length > 0);

    // Format documents
    const documentsMap = {};
    docs.forEach(doc => {
      documentsMap[doc.document_type] = doc.document_data;
    });

    // Generate reference number
  const refNo = app.application_number;

 // HTML template removed - now using PDF-lib direct generation

  // Generate PDF with PDF-lib
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595.28, 841.89]); // A4 size

// Load fonts
const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

// Generate QR Code
const qrCodeDataUrl = await QRCode.toDataURL(`Application: ${app.application_number}\nName: ${app.applicant_name}\nRelation: ${app.relation || 'N/A'}\nPO: ${app.post_office || 'N/A'}\nPS: ${app.police_station || 'N/A'}\nVillage: ${app.village_name}`);
const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);

// Embed images if they exist
let letterheadImage = null;
let signatureImage = null;
let sealImage = null;
let roundSealImage = null;
if (documentsMap.letterhead) {
  try {
    const letterheadBytes = Buffer.from(documentsMap.letterhead.split(',')[1], 'base64');
    // Detect image format from data URL
    if (documentsMap.letterhead.startsWith('data:image/png')) {
      letterheadImage = await pdfDoc.embedPng(letterheadBytes);
    } else if (documentsMap.letterhead.startsWith('data:image/jpeg') || documentsMap.letterhead.startsWith('data:image/jpg')) {
      letterheadImage = await pdfDoc.embedJpg(letterheadBytes);
    }
  } catch (e) {
    console.log('Letterhead embed error:', e);
  }
}

if (documentsMap.signature) {
  try {
    const signatureBytes = Buffer.from(documentsMap.signature.split(',')[1], 'base64');
    if (documentsMap.signature.startsWith('data:image/png')) {
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    } else if (documentsMap.signature.startsWith('data:image/jpeg') || documentsMap.signature.startsWith('data:image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    }
  } catch (e) {
    console.log('Signature embed error:', e);
  }
}

if (documentsMap.seal) {
  try {
    const sealBytes = Buffer.from(documentsMap.seal.split(',')[1], 'base64');
    if (documentsMap.seal.startsWith('data:image/png')) {
      sealImage = await pdfDoc.embedPng(sealBytes);
    } else if (documentsMap.seal.startsWith('data:image/jpeg') || documentsMap.seal.startsWith('data:image/jpg')) {
      sealImage = await pdfDoc.embedJpg(sealBytes);
    }
  } catch (e) {
    console.log('Seal embed error:', e);
  }
}

if (documentsMap.roundSeal) {
  try {
    const roundSealBytes = Buffer.from(documentsMap.roundSeal.split(',')[1], 'base64');
    if (documentsMap.roundSeal.startsWith('data:image/png')) {
      roundSealImage = await pdfDoc.embedPng(roundSealBytes);
    } else if (documentsMap.roundSeal.startsWith('data:image/jpeg') || documentsMap.roundSeal.startsWith('data:image/jpg')) {
      roundSealImage = await pdfDoc.embedJpg(roundSealBytes);
    }
  } catch (e) {
    console.log('Round seal embed error:', e);
  }
}

// Draw certificate content
const { width, height } = page.getSize();

// Border (smaller size)
page.drawRectangle({
  x: 30,
  y: 30,
  width: width - 60,
  height: height - 60,
  borderColor: rgb(0, 0, 0),
  borderWidth: 1,
});

// Letterhead or Authority name - Updated to reach borders with 2-3px gap
if (letterheadImage) {
  // Calculate letterhead width to reach both sides with 2-3px gap
  const letterheadWidth = width - 66; // 30px border + 3px gap on each side = 66px total margin
  const letterheadHeight = 120; // Increased proportionally from original 100px
  
  page.drawImage(letterheadImage, {
    x: 33, // 30px border + 3px gap
    y: height - 180, // Adjusted Y position for larger height
    width: letterheadWidth,
    height: letterheadHeight,
  });
} else {
  page.drawText(app.village_name.toUpperCase() + ' VILLAGE AUTHORITY', {
    x: width / 2 - 200,
    y: height - 120,
    size: 20,
    font: timesBoldFont,
    color: rgb(0.17, 0.35, 0.63),
  });
  
  page.drawText(`${app.district} District - ${app.pin_code}, ${app.state}`, {
    x: width / 2 - 120,
    y: height - 145,
    size: 12,
    font: timesFont,
    color: rgb(0.4, 0.4, 0.4),
  });
}

// Reference number and date (adjusted for new letterhead position)
page.drawText(`Rf. No. ${refNo}`, {
  x: 60,
  y: height - 220, // Adjusted for larger letterhead
  size: 14,
  font: timesBoldFont,
  color: rgb(0.17, 0.35, 0.63),
});

page.drawText(`Dated: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`, {
  x: width - 200,
  y: height - 220, // Adjusted for larger letterhead
  size: 12,
  font: timesFont,
});
// Main title (adjusted position)
page.drawText('TO WHOM IT MAY CONCERN', {
  x: width / 2 - 120,
  y: height - 300, // Adjusted for larger letterhead
  size: 16,
  font: timesBoldFont,
});
// Function to convert text to proper case
const toProperCase = (text) => {
  if (!text) return text;
  return text.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Check if template exists and has content
if (!template.length || !template[0] || !template[0].template || template[0].template.trim() === '') {
  console.log('7. No template found for village or template is empty');
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ 
      error: 'No certificate template configured for this village. Please contact the village administrator to set up the certificate template before generating certificates.',
      requiresTemplate: true 
    })
  };
}

// Get current date
const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

// Helper functions
const getPronoun = (title) => {
  const lowerTitle = title?.toLowerCase();
  if (lowerTitle === 'mr') {
    return { subject: 'He', object: 'him', possessive: 'his' };
  } else if (lowerTitle === 'mrs' || lowerTitle === 'miss' || lowerTitle === 'ms') {
    return { subject: 'She', object: 'her', possessive: 'her' };
  } else {
    return { subject: 'He/She', object: 'him/her', possessive: 'his/her' };
  }
};

const formatRelation = (relation) => {
  if (!relation) return '';
  const relationLower = relation.toLowerCase();
  if (relationLower.includes('son') || relationLower.includes('daughter') || relationLower.includes('child')) return 'F/O';
  if (relationLower.includes('wife') || relationLower.includes('spouse')) return 'H/O';
  if (relationLower.includes('ward') || relationLower.includes('dependent')) return 'G/O';
  return 'F/O';
};

const formatCurrency = (amount, words) => {
  if (!amount) return '';
  const formattedAmount = parseInt(amount).toLocaleString('en-IN');
  return `Rs. ${formattedAmount} (Rupees ${toProperCase(words)} only)`;
};

// Build clean values
const pronouns = getPronoun(app.title);
const relationPrefix = formatRelation(app.relation);
const relationName = app.father_name || app.mother_name || app.husband_name || app.guardian_name;
const fullName = relationPrefix && relationName ? 
  `${toProperCase(app.applicant_name)} ${relationPrefix} ${toProperCase(relationName)}` : 
  `${toProperCase(app.applicant_name)}`;
// Clean template processing
let certificateText = template[0].template
  .replace(/{{TITLE}}/g, toProperCase(app.title))
  .replace(/{{APPLICANT_NAME}}/g, fullName)
  .replace(/{{RELATION}}/g, '')
  .replace(/{{FATHER_NAME}}/g, '')
  .replace(/{{HOUSE_NUMBER}}/g, app.house_number || '')
  .replace(/{{VILLAGE_NAME}}/g, toProperCase(app.village_name))
  .replace(/{{POST_OFFICE}}/g, toProperCase(app.post_office))
  .replace(/{{POLICE_STATION}}/g, toProperCase(app.police_station))
  .replace(/{{SUB_DIVISION}}/g, toProperCase(app.sub_division))
  .replace(/{{DISTRICT}}/g, toProperCase(app.district))
  .replace(/{{STATE}}/g, toProperCase(app.state))
  .replace(/{{PIN_CODE}}/g, app.pin_code || '')
  .replace(/{{TRIBE_NAME}}/g, toProperCase(app.tribe_name))
  .replace(/{{RELIGION}}/g, toProperCase(app.religion))
  .replace(/{{ANNUAL_INCOME}}/g, formatCurrency(app.annual_income, app.annual_income_words))
  .replace(/{{ADMIN_NAME}}/g, toProperCase(app.admin_name))
  .replace(/He\/She/g, pronouns.subject)
  .replace(/he\/she/g, pronouns.subject.toLowerCase())
  .replace(/his\/her/g, pronouns.possessive.toLowerCase())
  .replace(/No Objection Certificate\./g, '')
  .replace(/Date:\s*[0-9\-]+/g, '')
  .replace(/Place:\s*\*\*[^*]+\*\*/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Add paragraph breaks for proper formatting
certificateText = certificateText
  .replace(/(795142\.|Pin Code\s*\d+)/g, '$1\n\n')  // After PIN code
  .replace(/(Village record\.)/g, '$1\n\n')  // After "Village record"
  .replace(/(He is not related to me\.)/g, '\n\n$1'); // Before final statement

// Split text into paragraphs and draw with justification
const paragraphs = certificateText.split('\n\n');
let yPosition = height - 320;
const maxWidth = width - 120;
const leftMargin = 60;
const rightMargin = width - 60;

paragraphs.forEach(paragraph => {
  if (paragraph.trim()) {
    // Replace any remaining single line breaks with spaces within paragraphs
    const cleanParagraph = paragraph.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // Create word objects with bold formatting info
    const wordObjects = [];
    const words = cleanParagraph.split(' ');
    
    words.forEach(word => {
      const isBold = word.startsWith('**') && word.endsWith('**');
      const cleanWord = isBold ? word.replace(/\*\*/g, '') : word;
      if (cleanWord.trim()) {  // Only add non-empty words
        wordObjects.push({
          text: cleanWord,
          isBold: isBold
        });
      }
    });
    
    // Build lines with word objects
    const lines = [];
    let currentLine = [];
    let currentLineText = '';
    
    for (const wordObj of wordObjects) {
      const testFont = wordObj.isBold ? timesBoldFont : timesFont;
      const testLine = currentLineText + (currentLineText ? ' ' : '') + wordObj.text;
      const textWidth = testFont.widthOfTextAtSize(testLine, 14);
      
      if (textWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [wordObj];
        currentLineText = wordObj.text;
      } else {
        currentLine.push(wordObj);
        currentLineText = testLine;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // Draw lines with justification
    lines.forEach((line, index) => {
      const isLastLine = index === lines.length - 1;
      
      if (line.length === 1 || isLastLine) {
        // Don't justify single words or last line
        let xPosition = leftMargin;
        line.forEach(wordObj => {
          const font = wordObj.isBold ? timesBoldFont : timesFont;
          page.drawText(wordObj.text, {
            x: xPosition,
            y: yPosition,
            size: 14,
            font: font,
          });
          xPosition += font.widthOfTextAtSize(wordObj.text + ' ', 14);
        });
      } else {
        // Justify the line
        const totalWordsWidth = line.reduce((sum, wordObj) => {
          const font = wordObj.isBold ? timesBoldFont : timesFont;
          return sum + font.widthOfTextAtSize(wordObj.text, 14);
        }, 0);
        const spaceWidth = (maxWidth - totalWordsWidth) / (line.length - 1);
        
        let xPosition = leftMargin;
        line.forEach((wordObj, wordIndex) => {
          const font = wordObj.isBold ? timesBoldFont : timesFont;
          page.drawText(wordObj.text, {
            x: xPosition,
            y: yPosition,
            size: 14,
            font: font,
          });
          if (wordIndex < line.length - 1) {
            xPosition += font.widthOfTextAtSize(wordObj.text, 14) + spaceWidth;
          }
        });
      }
      yPosition -= 20;
    });
    
    // Add paragraph spacing
    yPosition -= 10;
  }
});

// QR Code
page.drawImage(qrCodeImage, {
  x: 60,
  y: 120,
  width: 80,
  height: 80,
});

// Signature
if (signatureImage) {
  page.drawImage(signatureImage, {
    x: width - 220,
    y: 160,
    width: 120,
    height: 50,
  });
}

// Date and Place (left side, below QR code)
page.drawText(`Date: ${currentDate}`, {
  x: 60,
  y: 80,
  size: 12,
  font: timesFont,
});

page.drawText(`Place: ${toProperCase(app.sub_division || app.district)}`, {
  x: 60,
  y: 65,
  size: 12,
  font: timesFont,
});

// Official text (right side, aligned with signature)
page.drawText(`${toProperCase(app.admin_name)}`, {
  x: width - 200,
  y: 140,
  size: 12,
  font: timesBoldFont,
});

page.drawText('Headman/Chairman', {
  x: width - 200,
  y: 125,
  size: 10,
  font: timesFont,
});

page.drawText(`${toProperCase(app.village_name)} Village`, {
  x: width - 200,
  y: 110,
  size: 10,
  font: timesFont,
});

// Regular Seal (right side, below village name with more space) - Updated size
if (sealImage) {
  page.drawImage(sealImage, {
    x: width - 240, // Adjusted position for larger seal
    y: 70, // Slightly adjusted position
    width: 85, // Increased proportionally from 70
    height: 85, // Increased proportionally from 70
  });
}

// Round Seal (right side, more spaced out) - Updated size
if (roundSealImage) {
  page.drawImage(roundSealImage, {
    x: width - 140, // Adjusted position for larger seal
    y: 70, // Slightly adjusted position
    width: 85, // Increased proportionally from 70
    height: 85, // Increased proportionally from 70
  });
}

const pdf = await pdfDoc.save();

    return {
  statusCode: 200,
  headers: {
    ...headers,
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="certificate-${app.application_number}.pdf"`
  },
  body: Buffer.from(pdf).toString('base64'),
  isBase64Encoded: true
};

 } catch (error) {
    console.error('Certificate generation error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate certificate', details: error.message })
    };
  }
};
