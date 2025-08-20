import React from 'react';
import QuestionnaireForm from '../../../Common/QuestionnaireForm';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Save BookingForm PDF"
            onPdfButtonClick={() => alert('PDF generation for BookingForm is not yet implemented.')}
            valueColumnHeader=""
            hideCompletedColumn={true}
        />
    );
};

export default Form; 