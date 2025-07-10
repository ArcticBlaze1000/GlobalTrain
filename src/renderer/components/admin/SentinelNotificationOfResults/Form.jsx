import React from 'react';
import QuestionnaireForm from '../../../Common/QuestionnaireForm';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Save SentinelNotificationOfResults PDF"
            onPdfButtonClick={() => alert('PDF generation for SentinelNotificationOfResults is not yet implemented.')}
            valueColumnHeader=""
            hideCompletedColumn={true}
        />
    );
};

export default Form; 