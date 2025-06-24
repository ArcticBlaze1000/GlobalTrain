import React from 'react';
import { generateChecklistPdf } from './PDFGenerator';

const Form = ({ eventDetails }) => {
    
    const handleGenerateClick = () => {
        if (eventDetails?.id) {
            generateChecklistPdf(eventDetails.id);
        } else {
            alert("No event selected. Cannot generate PDF.");
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Training Course Checklist</h2>
            <p className="text-gray-600 mb-6">
                This document is a static checklist. When you are ready, you can generate the PDF.
            </p>
            <button
                onClick={handleGenerateClick}
                className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
                Generate Checklist PDF
            </button>
        </div>
    );
};

export default Form; 