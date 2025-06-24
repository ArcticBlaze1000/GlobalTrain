import React from 'react';
import QuestionnaireForm from '../common/QuestionnaireForm';
import { generateChecklistPdf } from './PDFGenerator';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Generate Checklist PDF"
            onPdfButtonClick={() => generateChecklistPdf(props.eventDetails.id)}
        />
    );
};

export default Form; 