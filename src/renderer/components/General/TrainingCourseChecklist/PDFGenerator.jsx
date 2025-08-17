import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateChecklistPdf = async (datapackId) => {
    if (!datapackId) {
        throw new Error("Cannot generate PDF: No event selected.");
    }

    // 1. Fetch all necessary data from the database
    const datapack = (await window.db.query('SELECT * FROM datapack WHERE id = @param1', [datapackId]))[0];
    if (!datapack) throw new Error("Datapack not found.");

    const course = (await window.db.query('SELECT * FROM courses WHERE id = @param1', [datapack.course_id]))[0];
    const trainer = (await window.db.query('SELECT * FROM users WHERE id = @param1', [datapack.trainer_id]))[0];
    
    const document = (await window.db.query('SELECT * FROM documents WHERE name = @param1', ['TrainingCourseChecklist']))[0];
    
    // Fetch all questions for the checklist
    const allQuestions = await window.db.query('SELECT * FROM questionnaires WHERE document_id = @param1 ORDER BY id', [document.id]);
    
    // Fetch all responses for the checklist
    const allResponses = await window.db.query('SELECT field_name, response_data, additional_comments FROM responses WHERE datapack_id = @param1 AND document_id = @param2', [datapackId, document.id]);

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

    // 5. Call the combined generate and upload function
    const fileName = `${course.name.replace(/\s+/g, '_')}_TrainingCourseChecklist.pdf`;
    const eventDetails = { ...datapack, courseName: course.name, trainer_id: trainer.id };
    
    const url = await window.electron.generateAndUploadPdf({
        htmlContent,
        fileName,
        contentType: 'application/pdf',
        eventDetails,
        documentDetails: { ...document, save: 'Main' },
        traineeDetails: null,
        options: { landscape: false }
    });
    
    return url;
}; 