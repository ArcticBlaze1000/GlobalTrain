import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateProgressRecordPdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async () => {
        if (props.eventDetails?.id && props.documentDetails?.id) {
            await generateProgressRecordPdf(props.eventDetails.id, props.documentDetails.id);
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