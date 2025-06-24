import React from 'react';
import ReactDOMServer from 'react-dom/server';
import RegisterTemplate from './RegisterTemplate';

const RegisterPDFGenerator = ({ datapackId }) => {

    const handleGeneratePdf = async () => {
        if (!datapackId) {
            alert('No event selected.');
            return;
        }

        try {
            // 1. Fetch all data required for the template
            const [datapackResult, courses, users] = await Promise.all([
                window.db.query('SELECT * FROM datapack WHERE id = ?', [datapackId]),
                window.db.query('SELECT * FROM courses'),
                window.db.query('SELECT * FROM users'),
            ]);

            if (!datapackResult.length) throw new Error('Datapack not found.');
            const datapack = datapackResult[0];

            const course = courses.find(c => c.id === datapack.course_id);
            const trainer = users.find(u => u.id === datapack.trainer_id);
            
            const traineeIds = datapack.trainee_ids.split(',').map(Number);
            const placeholders = traineeIds.map(() => '?').join(',');
            const trainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${placeholders})`, traineeIds);

            // 2. Render React component to static HTML
            const htmlContent = ReactDOMServer.renderToStaticMarkup(
                <RegisterTemplate
                    course={course}
                    trainer={trainer}
                    datapack={datapack}
                    trainees={trainees}
                />
            );

            // 3. Send HTML to main process for PDF generation
            const savedPath = await window.electron.generatePdfFromHtml(htmlContent, datapackId);
            alert(`Register saved successfully to: ${savedPath}`);

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