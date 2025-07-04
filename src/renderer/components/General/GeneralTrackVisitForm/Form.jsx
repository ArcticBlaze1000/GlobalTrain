import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateGeneralTrackVisitFormPdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async () => {
        const { eventDetails, user, documentDetails } = props;

        // 1. Fetch all trainees for this event
        const traineeIds = eventDetails.trainee_ids.split(',');
        const trainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);

        // 2. Fetch all responses for this document/event
        const allResponses = await window.db.query('SELECT * FROM responses WHERE datapack_id = ? AND document_id = ?', [eventDetails.id, documentDetails.id]);
        
        const responsesMap = allResponses.reduce((acc, res) => {
            let data = res.response_data;
            try {
                data = JSON.parse(res.response_data);
            } catch (e) {
                // Not JSON, use as is
            }
            acc[res.field_name] = { ...res, data };
            return acc;
        }, {});

        // 3. Assemble all data for the template
        const formData = {
            issuedBy: `${user.forename} ${user.surname}`,
            courseDate: new Date(eventDetails.start_date).toLocaleDateString('en-GB'),
            startTime: responsesMap.start_time?.data || '',
            finishTime: responsesMap.finish_time?.data || '',
            trainees,
            responses: responsesMap,
            eventDetails,
            documentDetails,
        };

        // 4. Generate PDF
        try {
            await generateGeneralTrackVisitFormPdf(formData);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. See console for details.');
        }
    };
    
    return (
        <QuestionnaireForm
            {...props}
            valueColumnHeader="Time"
            pdfButtonText="Save General Track Visit Form PDF"
            onPdfButtonClick={handleGeneratePdf}
        />
    );
};

export default Form;