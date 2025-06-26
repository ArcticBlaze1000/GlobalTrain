import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import PDFGenerator from './PDFGenerator';

const Form = (props) => {
    const handlePdfButtonClick = () => {
        PDFGenerator(props);
    };

    return (
        <QuestionnaireForm
            {...props}
            onPdfButtonClick={handlePdfButtonClick}
            pdfButtonText="Generate Phone Call Exercise PDF"
        />
    );
};

export default Form;
