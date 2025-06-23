import React from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const RegisterPDFGenerator = ({ datapackId }) => {

    const handleGeneratePdf = async () => {
        if (!datapackId) {
            alert('No event selected.');
            return;
        }

        try {
            // 1. Fetch all required data in parallel
            const [datapackResult, courses, users] = await Promise.all([
                window.db.query('SELECT * FROM datapack WHERE id = ?', [datapackId]),
                window.db.query('SELECT * FROM courses'),
                window.db.query('SELECT * FROM users'),
            ]);

            if (!datapackResult.length) throw new Error('Datapack not found.');
            const datapack = datapackResult[0];

            // 2. Map IDs to names
            const course = courses.find(c => c.id === datapack.course_id);
            const trainer = users.find(u => u.id === datapack.trainer_id);
            
            // 3. Fetch trainees
            const traineeIds = datapack.trainee_ids.split(',').map(Number);
            const placeholders = traineeIds.map(() => '?').join(',');
            const trainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${placeholders})`, traineeIds);

            // 4. Create PDF
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const fontSize = 11;
            const margin = 50;
            let y = height - margin;

            // -- Header --
            page.drawText(`Course Register`, { x: margin, y, font: boldFont, size: 18 });
            y -= 30;
            page.drawText(`Course: ${course.name}`, { x: margin, y, font, size: fontSize });
            page.drawText(`Trainer: ${trainer.forename} ${trainer.surname}`, { x: width / 2, y, font, size: fontSize });
            y -= 15;
            page.drawText(`Date: ${new Date(datapack.start_date).toLocaleDateString('en-GB')}`, { x: margin, y, font, size: fontSize });
            page.drawText(`Duration: ${datapack.duration} days`, { x: width / 2, y, font, size: fontSize });
            y -= 30;

            // -- Table Header --
            const tableTop = y;
            const tableHeaderX = margin + 2;
            page.drawText('Full Name', { x: tableHeaderX, y: tableTop - 15, font: boldFont, size: fontSize });
            page.drawText('Sponsor', { x: tableHeaderX + 200, y: tableTop - 15, font: boldFont, size: fontSize });
            page.drawText('Sentry Number', { x: tableHeaderX + 350, y: tableTop - 15, font: boldFont, size: fontSize });
            y -= 20;

            // -- Table Rows --
            for (const trainee of trainees) {
                y -= 20;
                if (y < margin) { // Add new page if content overflows
                    page = pdfDoc.addPage();
                    y = height - margin;
                }
                page.drawText(`${trainee.forename} ${trainee.surname}`, { x: tableHeaderX, y, font, size: fontSize });
                page.drawText(trainee.sponsor, { x: tableHeaderX + 200, y, font, size: fontSize });
                page.drawText(trainee.sentry_number, { x: tableHeaderX + 350, y, font, size: fontSize });
            }

            // 5. Save PDF
            const pdfBytes = await pdfDoc.save();
            const savedPath = await window.electron.savePdf(pdfBytes, datapackId);
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