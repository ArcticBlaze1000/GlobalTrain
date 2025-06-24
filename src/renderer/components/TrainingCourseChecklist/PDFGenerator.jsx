import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateChecklistPdf = async (datapackId) => {
    if (!datapackId) {
        alert("Cannot generate PDF: No event selected.");
        return;
    }

    try {
        // 1. Fetch all necessary data from the database
        const datapack = (await window.db.query('SELECT * FROM datapack WHERE id = ?', [datapackId]))[0];
        if (!datapack) throw new Error("Datapack not found.");

        const course = (await window.db.query('SELECT * FROM courses WHERE id = ?', [datapack.course_id]))[0];
        const trainer = (await window.db.query('SELECT * FROM users WHERE id = ?', [datapack.trainer_id]))[0];
        
        const document = (await window.db.query('SELECT * FROM documents WHERE name = ?', ['TrainingCourseChecklist']))[0];
        const responses = await window.db.query('SELECT field_name, additional_comments FROM responses WHERE datapack_id = ? AND document_id = ?', [datapackId, document.id]);

        const commentsMap = responses.reduce((acc, res) => {
            if (res.additional_comments) {
                acc[res.field_name] = res.additional_comments;
            }
            return acc;
        }, {});

        // 2. Get the correct CSS path for styling
        const cssPath = await window.electron.getCssPath();

        // 3. Prepare props for the template
        const templateProps = {
            courseTitle: course?.name || 'N/A',
            trainerName: trainer ? `${trainer.forename} ${trainer.surname}` : 'N/A',
            courseDate: new Date(datapack.start_date).toLocaleDateString('en-GB'),
            cssPath: cssPath,
            comments: commentsMap,
        };

        // 4. Render the React component to an HTML string
        const htmlContent = ReactDOMServer.renderToStaticMarkup(
            <Template {...templateProps} />
        );

        // 5. Send the HTML to the main process for PDF generation
        await window.electron.generatePdfFromHtml(htmlContent, datapack.id);

    } catch (error) {
        console.error('Failed to generate Checklist PDF:', error);
        alert(`An error occurred while generating the PDF: ${error.message}`);
    }
}; 