import React from 'react';
import QuestionnaireForm from '../../Common/QuestionnaireForm';
import { generatePdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async () => {
        const { eventDetails, user, documentDetails } = props;

        // 1. Fetch all trainees for this event
        const traineeIds = eventDetails.trainee_ids.split(',');
        const trainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);

        // 2. Fetch all questions for this document
        const allQuestions = await window.db.query('SELECT * FROM questionnaires WHERE document_id = ?', [documentDetails.id]);
        const practicalQuestions = allQuestions.filter(q => q.section === 'Practical Elements Completed At Test Track');

        // 3. Fetch all responses for this document/event
        const allResponses = await window.db.query('SELECT * FROM responses WHERE datapack_id = ? AND document_id = ?', [eventDetails.id, documentDetails.id]);
        
        // Convert responses array to a map for easier lookup in the template
        const responsesMap = allResponses.reduce((acc, res) => {
            let data = res.response_data;
            try {
                // Attempt to parse data if it's a JSON string (for grids)
                data = JSON.parse(res.response_data);
            } catch (e) {
                // Not JSON, use as is
            }
            acc[res.field_name] = { ...res, data };
            return acc;
        }, {});

        // 4. Assemble all data for the template
        const formData = {
            issuedBy: `${user.forename} ${user.surname}`,
            courseDate: new Date(eventDetails.start_date).toLocaleDateString('en-GB'),
            startTime: responsesMap.start_time?.data || '',
            finishTime: responsesMap.finish_time?.data || '',
            trainees,
            responses: responsesMap,
            practicalQuestions,
            eventDetails,
            documentDetails,
        };

        // 5. Generate PDF
        try {
            await generatePdf(formData);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. See console for details.');
        }
    };
    
    return (
        <QuestionnaireForm
            {...props}
            valueColumnHeader="Attended"
            pdfButtonText="Save Training and Welding Track Safety Briefing PDF"
            onPdfButtonClick={handleGeneratePdf}
        />
    );
};

export default Form; 