import React from 'react';
import QuestionnaireForm from '../../../Common/QuestionnaireForm';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Save SentinelPreChecks PDF"
            onPdfButtonClick={() => alert('PDF generation for SentinelPreChecks is not yet implemented.')}
            valueColumnHeader=""
            hideCompletedColumn={true}
        />
    );
};

export default Form; 