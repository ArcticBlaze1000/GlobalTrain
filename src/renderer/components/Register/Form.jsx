// This file will contain the UI for the Register form.
import React from 'react';
import QuestionnaireForm from '../common/QuestionnaireForm';
// Note: PDF generation logic will need to be created or moved.
// For now, the button will be disabled.

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Generate Register PDF"
            // onPdfButtonClick={() => generateRegisterPdf(props.eventDetails.id)}
        />
    );
};

export default Form; 