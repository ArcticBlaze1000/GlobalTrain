import React from 'react';
import QuestionnaireForm from '../common/QuestionnaireForm';
import { generateChecklistPdf } from './PDFGenerator';
import Template from './Template';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            valueColumnHeader="Checked"
            pdfButtonText="Generate Checklist PDF"
            onPdfButtonClick={() => generateChecklistPdf(props.eventDetails.id)}
        />
    );
};

export default Form; 