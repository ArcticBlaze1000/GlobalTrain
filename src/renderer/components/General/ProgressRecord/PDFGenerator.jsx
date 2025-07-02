import ReactDOMServer from 'react-dom/server';
import Template from './Template';

export const generateProgressRecordPdf = async (payload) => {
    const { eventDetails, documentDetails } = payload;
    if (!eventDetails) {
        alert("Cannot generate PDF: No event selected.");
        return;
    }

    try {
        // 1. Fetch all necessary data from the database
        const course = (await window.db.query('SELECT * FROM courses WHERE id = ?', [eventDetails.course_id]))[0];
        const trainer = (await window.db.query('SELECT * FROM users WHERE id = ?', [eventDetails.trainer_id]))[0];
        
        // Helper function to get all dates for the event duration
        const getDates = (startDate, endDate) => {
            const dates = [];
            let currentDate = new Date(startDate);
            const stopDate = new Date(endDate);
            while (currentDate <= stopDate) {
                dates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return dates;
        };

        const eventDays = getDates(eventDetails.start_date, eventDetails.end_date);

        // 2. Get the logo for styling
        const logoBase64 = await window.electron.getLogoBase64();

        // 3. Prepare props for the template
        const templateProps = {
            courseName: course.name,
            trainerName: `${trainer.forename} ${trainer.surname}`,
            eventDays,
            logoBase64,
        };

        // 4. Render the React component to an HTML string
        const htmlContent = ReactDOMServer.renderToStaticMarkup(
            <Template {...templateProps} />
        );

        // 5. Construct payload and send to the main process for PDF generation and saving
        const pdfPayload = {
            htmlContent,
            eventDetails: { ...eventDetails, courseName: course.name, forename: trainer.forename, surname: trainer.surname },
            documentDetails: { ...documentDetails, name: 'Progress Record', scope: 'course' },
            options: { landscape: true }
        };

        await window.electron.savePdf(pdfPayload);

    } catch (error) {
        console.error('Failed to generate Progress Record PDF:', error);
        alert(`An error occurred while generating the PDF: ${error.message}`);
    }
};

const PDFGenerator = () => <div>Progress Record PDF Generator placeholder</div>;

export default PDFGenerator; 