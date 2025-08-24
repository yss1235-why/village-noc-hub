import { sql } from './utils/db.js';
import puppeteer from 'puppeteer';

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
    const refNo = `${app.village_name.substring(0,3).toUpperCase()}${new Date().getFullYear()}${String(app.id).padStart(6, '0')}`;

    // Create HTML certificate
    const certificateHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Times New Roman', serif;
          margin: 0;
          padding: 40px;
          line-height: 1.6;
        }
        .certificate-container {
          max-width: 800px;
          margin: 0 auto;
          border: 3px solid #000;
          padding: 0;
          position: relative;
          background: white;
        }
        .certificate-container::before {
          content: '';
          position: absolute;
          top: 10px; left: 10px; right: 10px; bottom: 10px;
          border: 2px solid #333;
          pointer-events: none;
        }
        .letterhead {
          width: 100%;
          max-height: 150px;
          object-fit: contain;
          margin-bottom: 20px;
        }
        .decorative-border {
          height: 50px;
          background: linear-gradient(45deg, #228B22, #32CD32, #228B22);
          margin: -40px -40px 20px -40px;
          clip-path: polygon(0 0, 8% 0, 10% 100%, 15% 0, 20% 100%, 25% 0, 30% 100%, 35% 0, 40% 100%, 45% 0, 50% 100%, 55% 0, 60% 100%, 65% 0, 70% 100%, 75% 0, 80% 100%, 85% 0, 90% 100%, 92% 0, 100% 0, 100% 100%, 0 100%);
          position: relative;
        }
        .decorative-border::after {
          content: '';
          position: absolute;
          top: 8px; left: 50%;
          transform: translateX(-50%);
          width: 25px; height: 25px;
          background: radial-gradient(circle, #DC143C, #B22222);
          border-radius: 50%;
        }
        .header-content {
          padding: 20px 40px 0 40px;
          text-align: center;
        }
        .authority-name {
          font-size: 22px;
          font-weight: bold;
          color: #2c5aa0;
          margin-bottom: 5px;
          letter-spacing: 1px;
        }
        .district-info {
          font-size: 14px;
          color: #666;
          font-style: italic;
          margin-bottom: 20px;
        }
        .document-info {
          display: flex;
          justify-content: space-between;
          padding: 15px 40px;
          border-bottom: 1px solid #ccc;
          font-size: 14px;
        }
        .ref-number {
          font-weight: bold;
          font-family: 'Brush Script MT', cursive;
          font-size: 16px;
          color: #2c5aa0;
        }
        .certificate-body {
          padding: 30px 40px;
        }
        .main-title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 30px;
          letter-spacing: 2px;
        }
        .certificate-text {
          text-align: justify;
          font-size: 16px;
          line-height: 1.8;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 40px 40px 40px;
        }
        .qr-placeholder {
          width: 100px; height: 100px;
          border: 2px solid #333;
          background: repeating-linear-gradient(0deg, #000 0, #000 1px, transparent 1px, transparent 3px),
                      repeating-linear-gradient(90deg, #000 0, #000 1px, transparent 1px, transparent 3px);
          background-size: 6px 6px;
        }
        .signature-section {
          text-align: center;
        }
        .signature-img {
          width: 150px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 10px;
        }
        .seal-img {
          width: 80px;
          height: 80px;
          object-fit: contain;
          position: absolute;
          right: 60px;
          bottom: 20px;
        }
        .official-info {
          font-size: 14px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <div class="decorative-border"></div>
        
        <div class="header-content">
          ${documentsMap.letterhead ? `<img src="${documentsMap.letterhead}" class="letterhead" alt="Letterhead">` : `
            <div class="office-text" style="font-style: italic; margin-bottom: 5px;">Office of the</div>
            <div class="authority-name">${app.village_name.toUpperCase()} VILLAGE AUTHORITY</div>
            <div class="district-info">${app.district} District - ${app.pin_code}, ${app.state}</div>
          `}
        </div>

        <div class="document-info">
          <div class="ref-number">Rf. No. ${refNo}</div>
          <div><strong>Dated</strong> ${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
        </div>

        <div class="certificate-body">
          <div class="main-title">TO WHOM IT MAY CONCERN</div>
          <div class="certificate-text">
            ${template.length ? 
              template[0].template
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
                .replace(/{{ANNUAL_INCOME_WORDS}}/g, app.annual_income_words || 'Not specified')
              :
              `This is to certify that ${app.applicant_name} ${app.relation || 'S/o'} ${app.father_name} is a resident of ${app.village_name} Village, ${app.district} District, ${app.state}.`
            }
          </div>
        </div>

        <div class="footer">
          <div class="qr-placeholder"></div>
          <div class="signature-section">
            ${documentsMap.signature ? `<img src="${documentsMap.signature}" class="signature-img" alt="Signature">` : '<div style="height: 60px; border-bottom: 2px solid #000; width: 150px; margin-bottom: 10px;"></div>'}
            <div style="font-size: 12px;">Headman/Secretary</div>
            <div style="font-size: 12px;">Signature with seal</div>
            <br>
            <div class="official-info">${app.admin_name || 'Village Authority'}</div>
            <div style="font-size: 12px;">Secretary, ${app.village_name} Village</div>
          </div>
        </div>
        
        ${documentsMap.roundSeal ? `<img src="${documentsMap.roundSeal}" class="seal-img" alt="Official Seal">` : ''}
      </div>
    </body>
    </html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    
    const page = await browser.newPage();
    await page.setContent(certificateHTML, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    await browser.close();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${app.application_number}.pdf"`
      },
      body: pdf.toString('base64'),
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
