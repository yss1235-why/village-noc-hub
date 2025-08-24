import { sql } from './utils/db.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export const handler = async (event, context) => {
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

    // Get application data
   const application = await sql`
      SELECT a.*, v.name as village_name, v.district, v.state, v.pin_code, v.admin_name
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
const qrCodeDataUrl = await QRCode.toDataURL(`Application: ${app.application_number}\nName: ${app.applicant_name}\nRelation: ${app.relation || 'S/o'}\nPO: ${app.post_office || app.village_name}\nPS: ${app.police_station || app.district}\nVillage: ${app.village_name}`);
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

// Border
page.drawRectangle({
  x: 30,
  y: 30,
  width: width - 60,
  height: height - 60,
  borderColor: rgb(0, 0, 0),
  borderWidth: 3,
});

// Letterhead or Authority name
if (letterheadImage) {
  page.drawImage(letterheadImage, {
    x: width / 2 - 150,
    y: height - 180,
    width: 300,
    height: 120,
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

// Reference number and date
page.drawText(`Rf. No. ${refNo}`, {
  x: 60,
  y: height - 200,
  size: 14,
  font: timesBoldFont,
  color: rgb(0.17, 0.35, 0.63),
});

page.drawText(`Dated: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`, {
  x: width - 200,
  y: height - 200,
  size: 12,
  font: timesFont,
});

// Main title
page.drawText('TO WHOM IT MAY CONCERN', {
  x: width / 2 - 120,
  y: height - 280,
  size: 16,
  font: timesBoldFont,
});

// Check if template exists
if (!template.length || !template[0]) {
  console.log('7. No template found for village');
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'No certificate template found for this village. Please contact the village admin to set up the template.' })
  };
}

// Check if template exists
if (!template.length || !template[0]) {
  console.log('7. No template found for village');
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'No certificate template found for this village. Please contact the village admin to set up the template.' })
  };
}

// Certificate text
const certificateText = template[0].template
  .replace(/{{TITLE}}/g, app.title || 'Mr./Ms.')
  .replace(/{{APPLICANT_NAME}}/g, app.applicant_name)
  .replace(/{{RELATION}}/g, app.relation || 'S/o')
  .replace(/{{FATHER_NAME}}/g, app.father_name)
  .replace(/{{HOUSE_NUMBER}}/g, app.house_number || '')
  .replace(/{{VILLAGE_NAME}}/g, app.village_name)
  .replace(/{{POST_OFFICE}}/g, app.post_office || app.village_name)
  .replace(/{{POLICE_STATION}}/g, app.police_station || app.district)
  .replace(/{{SUB_DIVISION}}/g, app.sub_division || app.district)
  .replace(/{{DISTRICT}}/g, app.district)
  .replace(/{{STATE}}/g, app.state)
  .replace(/{{PIN_CODE}}/g, app.pin_code)
  .replace(/{{TRIBE_NAME}}/g, app.tribe_name || '')
  .replace(/{{RELIGION}}/g, app.religion || '')
  .replace(/{{ANNUAL_INCOME_NUMBER}}/g, app.annual_income || 'Not specified')
  .replace(/{{ANNUAL_INCOME_WORDS}}/g, app.annual_income_words || 'Not specified');
// Split text into lines and draw
const words = certificateText.split(' ');
const lines = [];
let currentLine = '';
const maxWidth = width - 120;

for (const word of words) {
  const testLine = currentLine + (currentLine ? ' ' : '') + word;
  const textWidth = timesFont.widthOfTextAtSize(testLine, 14);
  
  if (textWidth > maxWidth && currentLine) {
    lines.push(currentLine);
    currentLine = word;
  } else {
    currentLine = testLine;
  }
}
if (currentLine) lines.push(currentLine);

let yPosition = height - 320;
lines.forEach(line => {
  page.drawText(line, {
    x: 60,
    y: yPosition,
    size: 14,
    font: timesFont,
  });
  yPosition -= 20;
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

// Official text
page.drawText('Headman/Secretary', {
  x: width - 200,
  y: 140,
  size: 10,
  font: timesFont,
});

page.drawText(`${app.admin_name || 'Village Authority'}`, {
  x: width - 200,
  y: 120,
  size: 12,
  font: timesBoldFont,
});

page.drawText(`Secretary, ${app.village_name} Village`, {
  x: width - 200,
  y: 105,
  size: 10,
  font: timesFont,
});

// Regular Seal (left side)
if (sealImage) {
  page.drawImage(sealImage, {
    x: 80,
    y: 50,
    width: 60,
    height: 60,
  });
}

// Round Seal (right side)
if (roundSealImage) {
  page.drawImage(roundSealImage, {
    x: width - 140,
    y: 50,
    width: 60,
    height: 60,
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
