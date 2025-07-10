import React from 'react';
import QuestionnaireForm from '../../Common/QuestionnaireForm';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Save PhotographicID PDF"
            onPdfButtonClick={() => alert('PDF generation for PhotographicID is not yet implemented.')}
            valueColumnHeader=""
            hideCompletedColumn={true}
        />
    );
};

export default Form; 