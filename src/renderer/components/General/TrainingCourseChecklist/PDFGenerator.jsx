import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateChecklistPdf = async (datapackId) => {
    if (!datapackId) {
        alert("Cannot generate PDF: No event selected.");
        return;
    }

    try {
        // Fetch all necessary data from the database
        const datapack = (await window.db.query('SELECT * FROM datapack WHERE id = ?', [datapackId]))[0];
        if (!datapack) throw new Error("Datapack not found.");

        const course = (await window.db.query('SELECT * FROM courses WHERE id = ?', [datapack.course_id]))[0];
        const trainer = (await window.db.query('SELECT * FROM users WHERE id = ?', [datapack.trainer_id]))[0];
        
        const document = (await window.db.query('SELECT * FROM documents WHERE name = ?', ['TrainingCourseChecklist']))[0];
        
        // Fetch all questions for the checklist
        const allQuestions = await window.db.query('SELECT * FROM questionnaires WHERE document_id = ? ORDER BY id', [document.id]);
        
        // Fetch all responses for the checklist
        const allResponses = await window.db.query('SELECT field_name, response_data, additional_comments FROM responses WHERE datapack_id = ? AND document_id = ?', [datapackId, document.id]);

        const responsesMap = allResponses.reduce((acc, res) => {
            acc[res.field_name] = res;
            return acc;
        }, {});

        // Filter out questions where the response was 'no'
        const visibleQuestions = allQuestions.filter(q => {
            const response = responsesMap[q.field_name];
            return response?.response_data !== 'no';
        });

        // Get the correct CSS path and logo for styling
        const cssPath = await window.electron.getCssPath();
        const logoBase64 = await window.electron.getLogoBase64();

        // Prepare props for the template
        const templateProps = {
            courseName: course?.name || 'N/A',
            trainerName: trainer ? `${trainer.forename} ${trainer.surname}` : 'N/A',
            courseDate: new Date(datapack.start_date).toLocaleDateString('en-GB'),
            cssPath: cssPath,
            logoBase64: logoBase64,
            questions: visibleQuestions,
            responses: responsesMap,
        };

        // Render the React component to an HTML string
        const htmlContent = ReactDOMServer.renderToStaticMarkup(
            <Template {...templateProps} />
        );

        // Send the HTML to the main process for PDF generation
        const payload = {
            htmlContent,
            eventDetails: { ...datapack, courseName: course.name, forename: trainer.forename, surname: trainer.surname },
            documentDetails: { ...document, scope: 'course' },
            options: { landscape: false }
        };

        await window.electron.savePdf(payload);

    } catch (error) {
        console.error('Failed to generate Checklist PDF:', error);
        alert(`An error occurred while generating the PDF: ${error.message}`);
    }
}; 