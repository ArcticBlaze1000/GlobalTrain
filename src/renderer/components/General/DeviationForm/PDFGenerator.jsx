import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateDeviationFormPdf = async (formData) => {
    // 1. Fetch the logo in Base64 format from the main process
    const logoBase64 = await window.electron.getLogoBase64();

    // 2. Combine formData with the logo
    const templateData = { ...formData, logo: logoBase64 };

    // 3. Render the React template to an HTML string
    const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template {...templateData} />);

    // 4. Send the HTML to the main process for PDF generation
    try {
        const payload = {
            htmlContent,
            eventDetails: formData.eventDetails,
            documentDetails: formData.documentDetails,
            options: { landscape: false }
        };
        const result = await window.electron.savePdf(payload);
        if (result.success) {
            console.log('PDF saved successfully:', result.filePath);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Failed to generate or save PDF:', error);
        alert(`Error generating PDF: ${error.message}`);
    }
};

const PDFGenerator = () => <div>Deviation Form PDF Generator placeholder</div>;

export default PDFGenerator; 