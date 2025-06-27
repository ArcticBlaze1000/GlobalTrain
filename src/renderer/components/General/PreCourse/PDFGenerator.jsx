import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generatePreCoursePdf = async (datapackId, documentId) => {
    // 1. Fetch the logo
    const logoBase64 = await window.electron.getLogoBase64();

    // 2. Fetch all responses for this document/event
    const allResponses = await window.db.query('SELECT * FROM responses WHERE datapack_id = ? AND document_id = ?', [datapackId, documentId]);
    
    // 3. Convert responses array to a map for easier lookup in the template
    const responsesMap = allResponses.reduce((acc, res) => {
        acc[res.field_name] = { ...res, data: res.response_data };
        return acc;
    }, {});

    // 4. Render the React template to an HTML string
    const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template responses={responsesMap} logo={logoBase64} />);

    // 5. Send the HTML to the main process for PDF generation
    try {
        const result = await window.electron.generatePdfFromHtml(htmlContent, datapackId, { landscape: false });
        console.log(result);
    } catch (error) {
        console.error('Error in PDF generation pipeline:', error);
        throw error;
    }
};

const PDFGenerator = () => <div>Placeholder PDF Generator</div>;

export default PDFGenerator; 