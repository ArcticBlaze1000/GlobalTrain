import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generatePreCoursePdf = async (payload) => {
    const { eventDetails, documentDetails } = payload;
    if (!eventDetails || !documentDetails) {
        alert("Cannot generate PDF: Missing critical information.");
        return;
    }

    try {
        // 1. Fetch the logo
        const logoBase64 = await window.electron.getLogoBase64();

        // 2. Fetch all responses for this document/event
        const allResponses = await window.db.query('SELECT * FROM responses WHERE datapack_id = @param1 AND document_id = @param2', [eventDetails.id, documentDetails.id]);

        // 3. Convert responses array to a map for easier lookup in the template
        const responsesMap = allResponses.reduce((acc, res) => {
            acc[res.field_name] = { ...res, data: res.response_data };
            return acc;
        }, {});

        // 4. Render the React template to an HTML string
        const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template responses={responsesMap} logo={logoBase64} />);

        // 5. Send the HTML to the main process for PDF generation
        const pdfPayload = {
            htmlContent,
            eventDetails,
            documentDetails,
            options: { landscape: false }
        };
        
        await window.electron.savePdf(pdfPayload);

    } catch (error) {
        console.error('Error in PDF generation pipeline:', error);
        throw error;
    }
};

const PDFGenerator = () => <div>Placeholder PDF Generator</div>;

export default PDFGenerator; 