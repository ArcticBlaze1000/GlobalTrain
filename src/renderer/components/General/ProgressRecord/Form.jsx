import React from 'react';
import QuestionnaireForm from '../../Common/QuestionnaireForm';
import { generateProgressRecordPdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async (responses) => {
        const payload = {
            eventDetails: props.eventDetails,
            documentDetails: props.documentDetails,
            responses,
        };
        await generateProgressRecordPdf(payload);
    };

    return (
        <QuestionnaireForm
            {...props}
            onPdfButtonClick={handleGeneratePdf}
            pdfButtonText="Save Progress Record PDF"
            valueColumnHeader="Satisfactory"
        />
    );
};

export default Form; 