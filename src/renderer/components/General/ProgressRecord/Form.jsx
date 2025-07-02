import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateProgressRecordPdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async () => {
        if (props.eventDetails) {
            const payload = {
                eventDetails: props.eventDetails,
                documentDetails: props.documentDetails,
            };
            await generateProgressRecordPdf(payload);
        }
    };

    return (
        <QuestionnaireForm
            {...props}
            onPdfButtonClick={handleGeneratePdf}
            pdfButtonText="Generate Progress Record"
        />
    );
};

export default Form; 