import React, { useState, useEffect } from 'react';
import QuestionnaireForm from '../../common/QuestionnaireForm';
import { generatePreCoursePdf } from './PDFGenerator';

const Form = (props) => {
    const [responses, setResponses] = useState({});

    // This effect is needed to get the latest responses for validation
    useEffect(() => {
        const fetchResponses = async () => {
            if (props.eventDetails?.id && props.documentDetails?.id) {
                const fetchedResponses = await window.db.query(
                    'SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ?',
                    [props.eventDetails.id, props.documentDetails.id]
                );
                const responsesMap = fetchedResponses.reduce((acc, res) => {
                    acc[res.field_name] = res.response_data;
                    return acc;
                }, {});
                setResponses(responsesMap);
            }
        };
        fetchResponses();
        // Re-fetch when the event or document changes, or when progress is updated
    }, [props.eventDetails, props.documentDetails, props.onProgressUpdate]);

    const handleGeneratePdf = async () => {
        // Validation logic
        const disabilitiesAnswer = responses['pre_disabilities_q'];
        const disabilitiesDetails = responses['pre_disabilities_details']?.trim();
        if (disabilitiesAnswer === 'Yes' && !disabilitiesDetails) {
            alert('Please provide details for your disabilities or health issues.');
            return;
        }

        const difficultiesAnswer = responses['pre_learning_difficulties_q'];
        const difficultiesDetails = responses['pre_learning_difficulties_details']?.trim();
        if (difficultiesAnswer === 'Yes' && !difficultiesDetails) {
            alert('Please provide details for your learning difficulties.');
            return;
        }

        // If validation passes, generate the PDF
        try {
            const payload = {
                eventDetails: props.eventDetails,
                documentDetails: props.documentDetails,
            };
            await generatePreCoursePdf(payload);
        } catch (error) {
            // Error is logged in the generator, but you could show an alert here too
            alert('Failed to generate PDF. See console for details.');
        }
    };

    return (
        <QuestionnaireForm
            {...props}
            valueColumnHeader="Response"
            pdfButtonText="Save Pre-Course PDF"
            onPdfButtonClick={handleGeneratePdf}
        />
    );
};

export default Form; 