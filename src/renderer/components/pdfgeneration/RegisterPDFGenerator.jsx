import React from 'react';
import ReactDOMServer from 'react-dom/server';
import RegisterTemplate from './RegisterTemplate';

const RegisterPDFGenerator = ({ datapackId }) => {

    const handleGeneratePdf = async () => {
        if (!datapackId) {
            alert("No datapack selected.");
            return;
        }

        try {
            // Fetch all necessary data
            const datapack = (await window.db.query('SELECT * FROM datapack WHERE id = ?', [datapackId]))[0];
            const course = (await window.db.query('SELECT * FROM courses WHERE id = ?', [datapack.course_id]))[0];
            const trainer = (await window.db.query('SELECT * FROM users WHERE id = ?', [datapack.trainer_id]))[0];
            
            const traineeIds = datapack.trainee_ids.split(',');
            const trainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);

            // Get the correct CSS path from the main process
            const cssPath = await window.electron.getCssPath();

            // Render the React component to an HTML string
            const htmlContent = ReactDOMServer.renderToStaticMarkup(
                <RegisterTemplate
                    course={course}
                    trainer={trainer}
                    datapack={datapack}
                    trainees={trainees}
                    cssPath={cssPath}
                />
            );

            // Send the HTML to the main process for PDF generation
            await window.electron.generatePdfFromHtml(htmlContent, datapackId);
            alert('PDF has been generated and saved to your Documents folder!');

        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert(`Error generating PDF: ${error.message}`);
        }
    };

    return (
        <div className="mt-6">
            <button
                onClick={handleGeneratePdf}
                className="w-full px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
                Generate Register PDF
            </button>
        </div>
    );
};

export default RegisterPDFGenerator; 