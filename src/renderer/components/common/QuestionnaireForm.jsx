import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Helper function to determine if the user can edit a specific question
const canUserEdit = (questionAccess, userRole) => {
    if (userRole === 'dev') return true;
    if (userRole === 'admin' && (questionAccess === 'admin' || questionAccess === 'trainer')) return true;
    if (userRole === 'trainer' && questionAccess === 'trainer') return true;
    return false;
};

// Debounce function to delay database updates
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const QuestionnaireForm = ({ user, eventDetails, documentDetails, onProgressUpdate, showPdfButton = true, pdfButtonText = "Generate PDF", onPdfButtonClick }) => {
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState({});
    
    const { datapackId, documentId } = useMemo(() => ({
        datapackId: eventDetails?.id,
        documentId: documentDetails?.id
    }), [eventDetails, documentDetails]);

    // Fetch questions and initialize responses
    useEffect(() => {
        const initializeForm = async () => {
            if (!documentId || !datapackId) return;

            const fetchedQuestions = await window.db.query(
                'SELECT * FROM questionnaires WHERE document_id = ?',
                [documentId]
            );
            setQuestions(fetchedQuestions);

            const initialResponses = {};
            for (const q of fetchedQuestions) {
                let response = await window.db.query(
                    'SELECT * FROM responses WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
                    [datapackId, documentId, q.field_name]
                );

                if (response.length === 0) {
                    await window.db.run(
                        'INSERT INTO responses (datapack_id, document_id, field_name, response_data, completed) VALUES (?, ?, ?, ?, ?)',
                        [datapackId, documentId, q.field_name, '', 0]
                    );
                    response = [{ response_data: '', completed: 0 }];
                }
                
                const responseData = response[0].response_data;
                const completed = !!response[0].completed;
                const parsedData = q.input_type === 'checkbox' ? responseData === 'true' : responseData;

                initialResponses[q.field_name] = { data: parsedData, completed: completed };
            }
            setResponses(initialResponses);
        };
        initializeForm();
    }, [documentId, datapackId]);
    
    const debouncedSave = useCallback(debounce(async (fieldName, value, isComplete) => {
        await window.db.run(
            'UPDATE responses SET response_data = ?, completed = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [value, isComplete, datapackId, documentId, fieldName]
        );
    }, 500), [datapackId, documentId]);

    const handleInputChange = (fieldName, value, inputType) => {
        const isComplete = inputType === 'checkbox' ? value : !!value?.trim();
        const newResponses = { ...responses, [fieldName]: { data: value, completed: isComplete } };
        setResponses(newResponses);
        const valueToSave = inputType === 'checkbox' ? String(value) : value;
        debouncedSave(fieldName, valueToSave, isComplete);
    };
    
    const completionPercentage = useMemo(() => {
        const totalQuestions = questions.length;
        if (totalQuestions === 0) return 100; // If no questions, it's complete
        const completedCount = Object.values(responses).filter(r => r.completed).length;
        return Math.round((completedCount / totalQuestions) * 100);
    }, [responses, questions]);

    useEffect(() => {
        if (documentId) onProgressUpdate(documentId, completionPercentage);
    }, [completionPercentage, documentId, onProgressUpdate]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

    const groupedQuestions = useMemo(() => {
        return questions.reduce((acc, q) => {
            const section = q.section || 'General';
            if (!acc[section]) acc[section] = [];
            acc[section].push(q);
            return acc;
        }, {});
    }, [questions]);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">{eventDetails.courseName}</h2>
                    <p className="text-sm text-gray-600">{documentDetails.name} — {formatDate(eventDetails.start_date)}</p>
                </div>
                <div className="w-1/4">
                    <p className="font-bold text-sm text-right mb-1">Completion: {completionPercentage}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                    </div>
                </div>
            </div>

            {Object.entries(groupedQuestions).map(([section, qs]) => (
                <div key={section}>
                    {section !== 'General' && <h3 className="text-md font-bold text-gray-500 mb-2 mt-4">{section}</h3>}
                    <div className="space-y-3">
                        {qs.map((q) => {
                            const isEditable = canUserEdit(q.access, user.role);
                            return (
                                <div key={q.id} className={`flex items-center justify-between p-4 bg-white rounded-lg shadow-sm ${!isEditable ? 'opacity-60' : ''}`}>
                                    <label className="text-gray-700 font-medium">{q.question_text}</label>
                                    <div className="flex items-center space-x-4">
                                        {q.input_type === 'text' && (
                                            <input
                                                type="text"
                                                value={responses[q.field_name]?.data || ''}
                                                onChange={(e) => handleInputChange(q.field_name, e.target.value, q.input_type)}
                                                className="p-2 border rounded-md w-64 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                disabled={!isEditable}
                                            />
                                        )}
                                        {q.input_type === 'checkbox' && (
                                            <input
                                                type="checkbox"
                                                checked={!!responses[q.field_name]?.data}
                                                onChange={(e) => handleInputChange(q.field_name, e.target.checked, q.input_type)}
                                                className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                disabled={!isEditable}
                                            />
                                        )}
                                        <div className="w-6 h-6">
                                            {!!responses[q.field_name]?.completed && (
                                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            {showPdfButton && (
                <div className="pt-4">
                    <button
                        onClick={onPdfButtonClick}
                        disabled={completionPercentage < 100}
                        className={`w-full py-3 px-4 text-white font-bold rounded-lg transition-colors ${
                            completionPercentage < 100 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {pdfButtonText}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionnaireForm; 