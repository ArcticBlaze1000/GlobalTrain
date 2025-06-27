import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

const PDFGenerator = () => <div>Placeholder PDF Generator</div>;

export const generateLeavingPdf = async (datapackId, traineeId, trainer) => {
    if (!datapackId || !traineeId || !trainer) {
        alert("Cannot generate PDF: Missing critical information.");
        return;
    }

    try {
        const document = (await window.db.query('SELECT id FROM documents WHERE name = ?', ['LeavingForm']))[0];
        if (!document) throw new Error("LeavingForm document not found in database.");

        const responses = await window.db.query(
            'SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ? AND trainee_ids = ?',
            [datapackId, document.id, String(traineeId)]
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
            trainerName: `${trainer.forename} ${trainer.surname}`,
            trainerSignature: responsesMap.leaving_trainer_signature || '',
            date: responsesMap.leaving_date || '',
        };

        const htmlContent = ReactDOMServer.renderToStaticMarkup(<Template {...templateProps} />);

        await window.electron.generatePdfFromHtml(htmlContent, `${datapackId}_trainee_${traineeId}_leaving`, { landscape: false });

    } catch (error) {
        console.error('Failed to generate Leaving Form PDF:', error);
        alert(`An error occurred while generating the PDF: ${error.message}`);
    }
};

export default PDFGenerator; 