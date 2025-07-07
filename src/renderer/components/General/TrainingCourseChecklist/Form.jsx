import React from 'react';
import QuestionnaireForm from '../../Common/QuestionnaireForm';
import { generateChecklistPdf } from './PDFGenerator';
import Template from './Template';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            valueColumnHeader="Checked"
            pdfButtonText="Save Training Course Checklist PDF"
            onPdfButtonClick={() => generateChecklistPdf(props.eventDetails.id)}
        />
    );
};

export default Form; 