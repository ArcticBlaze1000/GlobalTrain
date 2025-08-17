import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateProgressRecordPdf = async (payload) => {
    const { eventDetails, documentDetails } = payload;
    if (!eventDetails) {
        throw new Error("Cannot generate PDF: No event selected.");
    }

    try {
        // 1. Fetch all necessary data from the database
        const course = (await window.db.query('SELECT * FROM courses WHERE id = @param1', [eventDetails.course_id]))[0];
        const trainer = (await window.db.query('SELECT * FROM users WHERE id = @param1', [eventDetails.trainer_id]))[0];
        
        const allResponses = await window.db.query('SELECT field_name, response_data FROM responses WHERE datapack_id = @param1 AND document_id = @param2', [eventDetails.id, documentDetails.id]);
        
        const responsesMap = allResponses.reduce((acc, res) => {
            acc[res.field_name] = res.response_data;
            return acc;
        }, {});

        // 2. Get the logo for styling
        const logoBase64 = await window.electron.getLogoBase64();

        // 3. Prepare props for the template
        const templateProps = {
            courseName: course.name,
            trainerName: `${trainer.forename} ${trainer.surname}`,
            eventDetails,
            logoBase64,
            responses: responsesMap,
        };

        // 4. Render the React component to an HTML string
        const htmlContent = ReactDOMServer.renderToStaticMarkup(
            <Template {...templateProps} />
        );

        const fileName = `${course.name.replace(/\s+/g, '_')}_ProgressRecord.pdf`;

        // 5. Construct payload and send to the main process for PDF generation and saving
        const pdfPayload = {
            htmlContent,
            fileName,
            eventDetails: { ...eventDetails, courseName: course.name, forename: trainer.forename, surname: trainer.surname },
            documentDetails: { ...documentDetails, name: 'Progress Record', scope: 'course' },
            options: { landscape: true }
        };

        await window.electron.generateAndUploadPdf(pdfPayload);

    } catch (error) {
        console.error('Failed to generate Progress Record PDF:', error);
        throw new Error(`An error occurred while generating the PDF: ${error.message}`);
    }
};

const PDFGenerator = () => <div>Progress Record PDF Generator placeholder</div>;

export default PDFGenerator; 