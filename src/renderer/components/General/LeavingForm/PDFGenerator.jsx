import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

const PDFGenerator = () => <div>Placeholder PDF Generator</div>;

export const generateLeavingPdf = async (payload) => {
    const { eventDetails, documentDetails, traineeDetails } = payload;
    if (!eventDetails || !documentDetails || !traineeDetails) {
        alert("Cannot generate PDF: Missing critical information.");
        return;
    }

    try {
        const responses = await window.db.query(
            'SELECT field_name, response_data FROM responses WHERE datapack_id = @param1 AND document_id = @param2 AND trainee_ids = @param3',
            [eventDetails.id, documentDetails.id, String(traineeDetails.id)]
        );

        const responsesMap = responses.reduce((acc, res) => {
            acc[res.field_name] = res.response_data;
            return acc;
        }, {});

        const logoBase64 = await window.electron.getLogoBase64();

        const templateProps = {
            logoBase64,
            reasons: responsesMap.leaving_reasons || '',
            candidateSignature: responsesMap.leaving_candidate_signature || '',
            trainerName: `${eventDetails.forename} ${eventDetails.surname}`,
            trainerSignature: responsesMap.leaving_trainer_signature || '',
            date: responsesMap.leaving_date || '',
            traineeName: `${traineeDetails.forename} ${traineeDetails.surname}`,
        };

        const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template {...templateProps} />);

        const pdfPayload = {
            htmlContent,
            eventDetails,
            documentDetails,
            traineeDetails,
            options: { landscape: false }
        };

        await window.electron.savePdf(pdfPayload);

    } catch (error) {
        console.error('Failed to generate Leaving Form PDF:', error);
        alert(`An error occurred while generating the PDF: ${error.message}`);
    }
};

export default PDFGenerator; 