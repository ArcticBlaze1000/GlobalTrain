import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Helper function to determine if the user can edit a specific question
const canUserEdit = (questionAccess, userRole) => {
    if (userRole === 'dev') return true;
    if (userRole === 'admin' && questionAccess === 'admin') return true;
    if (userRole === 'trainer' && questionAccess === 'trainer') return true;
    return false;
};

// Debounce function to delay database updates
const debounce = (func, delay) => {
    let timeout;
    let lastArgs;

    const debounced = (...args) => {
        lastArgs = args;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (lastArgs) {
                func(...lastArgs);
                lastArgs = null;
            }
        }, delay);
    };

    debounced.flush = () => {
        clearTimeout(timeout);
        if (lastArgs) {
            func(...lastArgs);
            lastArgs = null;
        }
    };

    return debounced;
};

const QuestionnaireForm = ({ user, eventDetails, documentDetails, onProgressUpdate, showPdfButton = true, pdfButtonText = "Generate PDF", onPdfButtonClick, valueColumnHeader = "Yes/No" }) => {
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState({});
    const [openComments, setOpenComments] = useState({}); // Tracks which comment boxes are open
    const [questionOptions, setQuestionOptions] = useState({});
    const [trainees, setTrainees] = useState([]);
    
    const { datapackId, documentId } = useMemo(() => ({
        datapackId: eventDetails?.id,
        documentId: documentDetails?.id
    }), [eventDetails, documentDetails]);

    // Fetch questions and initialize responses
    useEffect(() => {
        const initializeForm = async () => {
            if (!documentId || !datapackId) return;

            // Fetch trainees if there's a datapack
            if (eventDetails?.trainee_ids) {
                const traineeIds = eventDetails.trainee_ids.split(',');
                if (traineeIds.length > 0) {
                    const fetchedTrainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);
                    setTrainees(fetchedTrainees);
                }
            }

            const fetchedQuestions = await window.db.query(
                'SELECT * FROM questionnaires WHERE document_id = ?',
                [documentId]
            );
            setQuestions(fetchedQuestions);

            const dropdownQuestionFieldNames = fetchedQuestions
                .filter(q => q.input_type === 'dropdown' || q.input_type === 'trainee_dropdown_grid')
                .map(q => q.field_name);

            if (dropdownQuestionFieldNames.length > 0) {
                const placeholders = dropdownQuestionFieldNames.map(() => '?').join(',');
                const allOptions = await window.db.query(
                    `SELECT question_field_name, option_value FROM questionnaire_options WHERE question_field_name IN (${placeholders})`,
                    dropdownQuestionFieldNames
                );

                const options = allOptions.reduce((acc, opt) => {
                    if (!acc[opt.question_field_name]) {
                        acc[opt.question_field_name] = [];
                    }
                    acc[opt.question_field_name].push(opt.option_value);
                    return acc;
                }, {});
                setQuestionOptions(options);
            }

            const initialResponses = {};
            for (const q of fetchedQuestions) {
                let response = await window.db.query(
                    'SELECT * FROM responses WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
                    [datapackId, documentId, q.field_name]
                );

                if (response.length === 0) {
                    await window.db.run(
                        'INSERT INTO responses (datapack_id, document_id, field_name, response_data, completed, additional_comments) VALUES (?, ?, ?, ?, ?, ?)',
                        [datapackId, documentId, q.field_name, '', 0, '']
                    );
                    response = [{ response_data: '', completed: 0, additional_comments: '' }];
                }
                
                const responseData = response[0].response_data;
                const completed = !!response[0].completed;
                const additionalComments = response[0].additional_comments || '';
                
                let parsedData;
                if (q.input_type === 'checkbox') {
                    parsedData = responseData === 'true';
                } else if (q.input_type === 'attendance_grid' || q.input_type === 'trainee_checkbox_grid' || q.input_type === 'trainee_date_grid' || q.input_type === 'trainee_dropdown_grid') {
                    try {
                        parsedData = responseData ? JSON.parse(responseData) : {};
                    } catch (e) {
                        console.error(`Failed to parse attendance data for ${q.field_name}:`, e);
                        parsedData = {};
                    }
                } else {
                    parsedData = responseData;
                }

                initialResponses[q.field_name] = { data: parsedData, completed: completed, comments: additionalComments };
            }
            setResponses(initialResponses);
        };
        initializeForm();
    }, [documentId, datapackId, eventDetails]);
    
    const debouncedSave = useCallback(debounce(async (fieldName, value, isComplete) => {
        await window.db.run(
            'UPDATE responses SET response_data = ?, completed = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [value, isComplete, datapackId, documentId, fieldName]
        );
    }, 500), [datapackId, documentId]);

    const debouncedCommentSave = useCallback(debounce(async (fieldName, comments) => {
        await window.db.run(
            'UPDATE responses SET additional_comments = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [comments, datapackId, documentId, fieldName]
        );
    }, 500), [datapackId, documentId]);

    // Effect to flush pending saves on unmount
    useEffect(() => {
        return () => {
            debouncedSave.flush();
            debouncedCommentSave.flush();
        };
    }, [debouncedSave, debouncedCommentSave]);

    const handleInputChange = (fieldName, value, inputType) => {
        const isComplete = inputType === 'checkbox' ? value : !!String(value).trim();
        const newResponses = { ...responses, [fieldName]: { ...responses[fieldName], data: value, completed: isComplete } };
        setResponses(newResponses);
        const valueToSave = inputType === 'checkbox' ? String(value) : value;
        debouncedSave(fieldName, valueToSave, isComplete);
    };

    const handleGridInputChange = (fieldName, traineeId, value, inputType) => {
        const currentGridData = responses[fieldName]?.data || {};
        const updatedGridData = { ...currentGridData, [traineeId]: value };

        // For grid types, 'completed' means every trainee has a non-empty value.
        const isComplete = trainees.every(t => {
            const traineeValue = updatedGridData[t.id];
            if (inputType === 'trainee_checkbox_grid') {
                return traineeValue !== undefined; // For checkboxes, just existing is enough
            }
            return traineeValue && String(traineeValue).trim() !== '';
        });

        const newResponses = {
            ...responses,
            [fieldName]: { ...responses[fieldName], data: updatedGridData, completed: isComplete }
        };
        setResponses(newResponses);

        const valueToSave = JSON.stringify(updatedGridData);
        debouncedSave(fieldName, valueToSave, isComplete);
    };

    const handleCommentChange = (fieldName, comments) => {
        const newResponses = { ...responses, [fieldName]: { ...responses[fieldName], comments: comments } };
        setResponses(newResponses);
        debouncedCommentSave(fieldName, comments);
        setOpenComments(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const toggleComment = (fieldName) => {
        setOpenComments(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };
    
    const completionPercentage = useMemo(() => {
        const relevantQuestions = questions.filter(q => {
            if (q.input_type === 'attendance_grid') {
                const dayNumber = parseInt(q.field_name.split('_')[1], 10);
                return dayNumber <= (eventDetails?.duration || 0);
            }
            return true;
        });

        const totalQuestions = relevantQuestions.length;
        if (totalQuestions === 0) return 100;

        const relevantCompletedCount = relevantQuestions.filter(q => responses[q.field_name]?.completed).length;
        return Math.round((relevantCompletedCount / totalQuestions) * 100);
    }, [responses, questions, eventDetails]);

    useEffect(() => {
        if (documentId) onProgressUpdate(documentId, completionPercentage);
    }, [completionPercentage, documentId, onProgressUpdate]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

    const handleGenerateAndCache = () => {
        if (process.env.NODE_ENV !== 'production') {
            // Store the callback function so the dev tools can access it
            window.dev_regenerateLastPdf = onPdfButtonClick;
        }
        onPdfButtonClick();
    };

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
                    <div className="space-y-3 p-4">
                        {/* Header Row */}
                        <div className="flex items-center justify-between font-bold text-gray-500 text-sm">
                            <span className="w-3/5">Item</span>
                            <span className="w-1/5 text-center">Completed</span>
                            <span className="w-1/5 text-center">{valueColumnHeader}</span>
                        </div>
                        
                        {qs.map((q) => {
                            if (q.input_type === 'attendance_grid') {
                                const dayNumber = parseInt(q.field_name.split('_')[1], 10);
                                if (!eventDetails?.duration || dayNumber > eventDetails.duration) {
                                    return null; // Don't render attendance days beyond the course duration
                                }
                                const isEditable = canUserEdit(q.access, user.role);
                        
                                return (
                                    <div key={q.id} className={`py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-gray-700">{q.question_text}</h4>
                                            <div className="w-1/5 flex justify-center">
                                                {!!responses[q.field_name]?.completed && (
                                                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 mt-3 pl-2">
                                            {trainees.map(trainee => (
                                                <div key={trainee.id} className="flex items-center">
                                                    <label className="w-2/5 text-sm text-gray-600 truncate pr-2" title={`${trainee.forename} ${trainee.surname}`}>
                                                        {trainee.forename} {trainee.surname}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={responses[q.field_name]?.data?.[trainee.id] || ''}
                                                        onChange={(e) => handleGridInputChange(q.field_name, trainee.id, e.target.value)}
                                                        className="p-1 border rounded-md w-3/5 disabled:bg-gray-200 disabled:cursor-not-allowed text-sm"
                                                        disabled={!isEditable}
                                                        placeholder={dayNumber === 1 ? 'Signature...' : 'Initials...'}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }

                            if (q.input_type === 'trainee_checkbox_grid' || q.input_type === 'trainee_date_grid' || q.input_type === 'trainee_dropdown_grid') {
                                const isEditable = canUserEdit(q.access, user.role);
                                return (
                                    <div key={q.id} className={`py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-gray-700">{q.question_text}</h4>
                                            <div className="w-1/5 flex justify-center">
                                                {!!responses[q.field_name]?.completed && (
                                                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 mt-3 pl-2">
                                            {trainees.map(trainee => (
                                                <div key={trainee.id} className="flex items-center justify-between">
                                                    <label className="w-auto text-sm text-gray-600 truncate pr-2" title={`${trainee.forename} ${trainee.surname}`}>
                                                        {trainee.forename} {trainee.surname}
                                                    </label>
                                                    {q.input_type === 'trainee_checkbox_grid' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={!!responses[q.field_name]?.data?.[trainee.id]}
                                                            onChange={(e) => handleGridInputChange(q.field_name, trainee.id, e.target.checked, q.input_type)}
                                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                            disabled={!isEditable}
                                                        />
                                                    )}
                                                    {q.input_type === 'trainee_dropdown_grid' && (
                                                        <select
                                                            value={responses[q.field_name]?.data?.[trainee.id] || ''}
                                                            onChange={(e) => handleGridInputChange(q.field_name, trainee.id, e.target.value, q.input_type)}
                                                            className="p-1 border rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed text-sm"
                                                            disabled={!isEditable}
                                                        >
                                                            <option value="">Select...</option>
                                                            {(questionOptions[q.field_name] || []).map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {q.input_type === 'trainee_date_grid' && (
                                                         <input
                                                            type="date"
                                                            value={responses[q.field_name]?.data?.[trainee.id] || ''}
                                                            onChange={(e) => handleGridInputChange(q.field_name, trainee.id, e.target.value, q.input_type)}
                                                            className="p-1 border rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed text-sm"
                                                            disabled={!isEditable}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }

                            const isEditable = canUserEdit(q.access, user.role);
                            const commentOpen = !!openComments[q.field_name];
                            return (
                                <div key={q.id} className={`flex flex-col py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="w-3/5 flex items-center">
                                            <span className="text-gray-700 font-medium">{q.question_text}</span>
                                            {q.has_comments === 'YES' && isEditable && (
                                                <button onClick={() => toggleComment(q.field_name)} className="ml-4 text-xs text-blue-500 hover:underline">
                                                    {commentOpen ? 'Cancel' : 'Add Comment'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="w-1/5 flex justify-center">
                                            {!!responses[q.field_name]?.completed && (
                                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            )}
                                        </div>

                                        <div className="w-1/5 flex justify-center">
                                            {q.input_type === 'checkbox' && (
                                                <input
                                                    type="checkbox"
                                                    checked={!!responses[q.field_name]?.data}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.checked, q.input_type)}
                                                    className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'date' && (
                                                <input
                                                    type="date"
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, q.input_type)}
                                                    className="p-2 border rounded-md w-48 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'number' && (
                                                <input
                                                    type="number"
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, q.input_type)}
                                                    className="p-2 border rounded-md w-24 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'dropdown' && (
                                                <select
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, q.input_type)}
                                                    className="p-2 border rounded-md w-48 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                    disabled={!isEditable}
                                                >
                                                    <option value="">Select...</option>
                                                    {(questionOptions[q.field_name] || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {/* Render other input types if necessary, or leave blank */}
                                        </div>
                                    </div>
                                    {q.has_comments === 'YES' && commentOpen && (
                                        <div className="mt-3">
                                            <textarea
                                                value={responses[q.field_name]?.comments || ''}
                                                onChange={(e) => handleCommentChange(q.field_name, e.target.value)}
                                                placeholder="Add your comments here..."
                                                className="w-full p-2 border rounded-md"
                                                rows="2"
                                                disabled={!isEditable}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            {showPdfButton && (
                <div className="pt-4 flex justify-end">
                    <button 
                        onClick={handleGenerateAndCache}
                        className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={completionPercentage < 100}
                    >
                        {pdfButtonText}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionnaireForm; 