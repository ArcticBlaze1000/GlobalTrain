// This file will contain the UI for the Register form.
import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateRegisterPdf } from './PDFGenerator';
import Template from './Template';
// Note: PDF generation logic will need to be created or moved.
// For now, the button will be disabled.

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            valueColumnHeader=""
            pdfButtonText="Generate Register PDF"
            onPdfButtonClick={() => generateRegisterPdf(props.eventDetails.id)}
        />
    );
};

export default Form; 