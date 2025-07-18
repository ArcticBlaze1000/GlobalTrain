import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generatePdf = async (formData) => {
    // 1. Fetch the logo in Base64 format from the main process
    const logoBase64 = await window.electron.getLogoBase64();

    // 2. Combine formData with the logo
    const templateData = { ...formData, logo: logoBase64 };

    // 3. Render the React template to an HTML string
    const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template {...templateData} />);

    // 4. Call the combined generate and upload function
    const { eventDetails, documentDetails } = formData;
    const fileName = `${eventDetails.courseName.replace(/\s+/g, '_')}_TrainingAndWeldingTrackSafetyBriefing.pdf`;
    
    const url = await window.electron.generateAndUploadPdf({
        htmlContent,
        fileName,
        contentType: 'application/pdf',
        eventDetails,
        documentDetails,
        traineeDetails: null,
        options: { landscape: false }
    });
    
    return url;
}; 