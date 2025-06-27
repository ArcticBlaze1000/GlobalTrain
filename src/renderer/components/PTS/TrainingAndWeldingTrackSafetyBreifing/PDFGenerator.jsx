import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generatePdf = async (formData, datapackId) => {
    // 1. Fetch the logo in Base64 format from the main process
    const logoBase64 = await window.electron.getLogoBase64();

    // 2. Combine formData with the logo
    const templateData = { ...formData, logo: logoBase64 };

    // 3. Render the React template to an HTML string
    const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template {...templateData} />);

    // 4. Send the HTML to the main process for PDF generation
    try {
        const result = await window.electron.generatePdfFromHtml(htmlContent, datapackId);
        console.log(result); // "PDF generated and opened successfully."
    } catch (error) {
        console.error('Error in PDF generation pipeline:', error);
        throw error; // Propagate the error to be caught by the form handler
    }
}; 