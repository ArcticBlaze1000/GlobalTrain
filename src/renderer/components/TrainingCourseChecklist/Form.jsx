import React from 'react';
import QuestionnaireForm from '../common/QuestionnaireForm';
import { generatePdf } from '../common/PDFGenerator';
import Template from './Template';

const Form = (props) => {
    return (
        <QuestionnaireForm
            {...props}
            pdfButtonText="Generate Checklist PDF"
            onPdfButtonClick={() => generatePdf(props.eventDetails.id, 'TrainingCourseChecklist', Template)}
        />
    );
};

export default Form; 