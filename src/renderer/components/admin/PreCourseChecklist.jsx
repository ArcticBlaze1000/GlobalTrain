import React from 'react';

const PreCourseChecklist = ({ register, onBackToList }) => {
    return (
        <div className="p-6">
            <button onClick={onBackToList} className="text-blue-600 hover:underline mb-4">
                &larr; Back to Registers
            </button>
            <h1 className="text-2xl font-bold">Pre-Course Checklist for {register?.courseName}</h1>
            <p className="mt-4">Details for the pre-course checklist will go here.</p>
        </div>
    );
};

export default PreCourseChecklist; 