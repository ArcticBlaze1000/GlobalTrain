import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateGeneralTrackVisitFormPdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async () => {
        const { eventDetails, user, documentDetails } = props;

        // 1. Fetch all responses for this document/event to get times
        const allResponses = await window.db.query('SELECT * FROM responses WHERE datapack_id = ? AND document_id = ?', [eventDetails.id, documentDetails.id]);
        
        const responsesMap = allResponses.reduce((acc, res) => {
            acc[res.field_name] = res.response_data;
            return acc;
        }, {});

        // 2. Assemble all data for the template
        const formData = {
            issuedBy: `${user.forename} ${user.surname}`,
            courseDate: new Date(eventDetails.start_date).toLocaleDateString('en-GB'),
            startTime: responsesMap.start_time || '',
            finishTime: responsesMap.finish_time || '',
            eventDetails,
            documentDetails,
        };

        // 3. Generate PDF
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