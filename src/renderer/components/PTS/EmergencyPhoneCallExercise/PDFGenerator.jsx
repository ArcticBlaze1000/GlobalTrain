import ReactDOMServer from 'react-dom/server';
import Template from './Template';

const PDFGenerator = async ({ eventDetails, documentDetails, selectedTraineeId }) => {
    try {
        const responses = {}; // This will be populated with actual data fetching logic later
        const trainee = await window.db.query('SELECT * FROM trainees WHERE id = ?', [selectedTraineeId]);

        const htmlContent = ReactDOMServer.renderToString(
            <Template
                trainee={trainee[0]}
                responses={responses}
            />
        );

        const pdfPath = await window.electron.generatePdf(htmlContent, `Emergency-Phone-Call-Exercise-${selectedTraineeId}`);

        if (pdfPath) {
            console.log(`PDF generated at: ${pdfPath}`);
        }
    } catch (error) {
        console.error('Failed to generate PDF:', error);
    }
};

export default PDFGenerator;
