import React from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generateProgressRecordPdf } from './PDFGenerator';

const Form = (props) => {
    const handleGeneratePdf = async () => {
        if (!props.eventDetails) return;

        // Fetch the latest responses for validation.
        const responses = await window.db.query(
            'SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ?',
            [props.eventDetails.id, props.documentDetails.id]
        );

        const responsesMap = responses.reduce((acc, res) => {
            acc[res.field_name] = res.response_data;
            return acc;
        }, {});

        const progressRecordData = responsesMap['progress_record_comments'];
        let commentsData = {};
        if (progressRecordData) {
            try {
                commentsData = JSON.parse(progressRecordData);
            } catch (e) {
                console.error("Failed to parse progress record comments for validation:", e);
            }
        }
        
        // Validation logic
        const summaries = commentsData.comments || [];
        const signature = commentsData.signature || '';

        if (summaries.length === 0) {
            alert('Please add at least one session summary before generating the PDF.');
            return;
        }

        if (!signature) {
            alert('A trainer signature is required before generating the PDF.');
            return;
        }

        // All checks passed, proceed with PDF generation.
        const payload = {
            eventDetails: props.eventDetails,
            documentDetails: props.documentDetails,
        };
        await generateProgressRecordPdf(payload);
    };

    return (
        <QuestionnaireForm
            {...props}
            onPdfButtonClick={handleGeneratePdf}
            pdfButtonText="Save Progress Record PDF"
        />
    );
};

export default Form; 