import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateRegisterPdf = async (datapackId) => {
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
        
        const traineeIds = datapack.trainee_ids.split(',');
        const trainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);

        const competencies = await window.db.query('SELECT * FROM competencies');

        const registerDoc = (await window.db.query('SELECT id FROM documents WHERE name = ?', ['Register']))[0];
        const responses = await window.db.query('SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ?', [datapackId, registerDoc.id]);
        
        const responsesMap = responses.reduce((acc, res) => {
            acc[res.field_name] = res.response_data;
            return acc;
        }, {});

        // Calculate successful trainees
        let successfulTraineesCount = 0;
        const passOrFailResponse = responsesMap['final_result'];
        if (passOrFailResponse) {
            try {
                const passOrFailData = JSON.parse(passOrFailResponse);
                successfulTraineesCount = Object.values(passOrFailData).filter(status => status === 'Competent').length;
            } catch (e) {
                console.error('Failed to parse final_result data in PDFGenerator:', e);
            }
        }

        // 2. Get the correct CSS path and logo for styling
        const cssPath = await window.electron.getCssPath();
        const logoBase64 = await window.electron.getLogoBase64();

        // 3. Prepare props for the template
        const templateProps = {
            course: course,
            trainer: trainer,
            datapack: datapack,
            trainees: trainees,
            competencies: competencies,
            cssPath: cssPath,
            logoBase64: logoBase64,
            responses: responsesMap,
            successfulTraineesCount: successfulTraineesCount,
        };

        // 4. Render the React component to an HTML string
        const htmlContent = ReactDOMServer.renderToStaticMarkup(
            <Template {...templateProps} />
        );

        // 5. Send the HTML to the main process for PDF generation and opening
        await window.electron.generatePdfFromHtml(htmlContent, datapack.id, { landscape: true });

    } catch (error) {
        console.error('Failed to generate Register PDF:', error);
        alert(`An error occurred while generating the PDF: ${error.message}`);
    }
}; 