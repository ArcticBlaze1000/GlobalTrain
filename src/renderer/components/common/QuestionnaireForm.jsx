import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import TriToggleButton from './TriToggleButton';

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

    const run = (args) => {
        if (!args) return;
        const result = func(...args);
        if (result && typeof result.then === 'function') {
            result.then(() => {
                if (lastArgs === args) {
                    lastArgs = null;
                }
            });
        } else {
            lastArgs = null;
        }
    };

    const debounced = (...args) => {
        lastArgs = args;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            run(lastArgs);
        }, delay);
    };

    debounced.flush = () => {
        clearTimeout(timeout);
        run(lastArgs);
    };

    return debounced;
};

const QuestionnaireForm = ({ user, eventDetails, documentDetails, onProgressUpdate, openSignatureModal, showPdfButton = true, pdfButtonText = "Generate PDF", onPdfButtonClick, valueColumnHeader = "Yes/No", selectedTraineeId }) => {
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState({});
    const [openComments, setOpenComments] = useState({}); // Tracks which comment boxes are open
    const [questionOptions, setQuestionOptions] = useState({});
    const [trainees, setTrainees] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    
    const { datapackId, documentId } = useMemo(() => ({
        datapackId: eventDetails?.id,
        documentId: documentDetails?.id
    }), [eventDetails, documentDetails]);

    // Fetch questions and initialize responses
    useEffect(() => {
        const initializeForm = async () => {
            if (!documentId || !datapackId) return;

            // Fetch course-specific competencies
            if (eventDetails?.competency_ids) {
                const competencyIds = eventDetails.competency_ids.split(',');
                if (competencyIds.length > 0) {
                    const fetchedCompetencies = await window.db.query(`SELECT * FROM competencies WHERE id IN (${competencyIds.map(() => '?').join(',')})`, competencyIds);
                    setCompetencies(fetchedCompetencies);
                }
            }

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
            setQuestions(fetchedQuestions.filter(q => q.input_type !== 'competency_grid'));

            const dropdownQuestionFieldNames = fetchedQuestions
                .filter(q => q.input_type === 'dropdown' || q.input_type === 'trainee_dropdown_grid' || q.input_type === 'trainee_yes_no_grid')
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
                    const traineeIdsForResponse = documentDetails.scope === 'candidate' ? String(selectedTraineeId) : eventDetails.trainee_ids;
                    const initialData = q.input_type === 'tri_toggle' ? 'neutral' : '';
                    await window.db.run(
                        'INSERT OR IGNORE INTO responses (datapack_id, document_id, trainee_ids, field_name, response_data, completed, additional_comments) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [datapackId, documentId, traineeIdsForResponse, q.field_name, initialData, 0, '']
                    );
                    response = await window.db.query(
                        'SELECT * FROM responses WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
                        [datapackId, documentId, q.field_name]
                    );
                }
                
                const responseData = response[0].response_data;
                const completed = !!response[0].completed;
                const additionalComments = response[0].additional_comments || '';
                
                let parsedData;
                if (q.input_type === 'checkbox') {
                    parsedData = responseData === 'true';
                } else if (q.input_type === 'tri_toggle') {
                    parsedData = responseData;
                } else if (q.input_type === 'attendance_grid' || q.input_type === 'trainee_checkbox_grid' || q.input_type === 'trainee_date_grid' || q.input_type === 'trainee_dropdown_grid' || q.input_type === 'competency_grid' || q.input_type === 'trainee_yes_no_grid' || q.input_type === 'signature_grid') {
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
    }, [documentId, datapackId, eventDetails, selectedTraineeId]);
    
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

    const debouncedGridSave = useCallback(debounce(async (fieldName, gridData, isComplete) => {
        await window.db.run(
            'UPDATE responses SET response_data = ?, completed = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [JSON.stringify(gridData), isComplete, datapackId, documentId, fieldName]
        );
    }, 500), [datapackId, documentId]);

    // Effect to flush pending saves on unmount
    useEffect(() => {
        const flushDebouncedSaves = () => {
            debouncedSave.flush();
            debouncedCommentSave.flush();
            debouncedGridSave.flush();
        };

        window.addEventListener('beforeunload', flushDebouncedSaves);

        return () => {
            flushDebouncedSaves();
            window.removeEventListener('beforeunload', flushDebouncedSaves);
        };
    }, [debouncedSave, debouncedCommentSave, debouncedGridSave]);

    const handleGridInputChange = (fieldName, traineeId, value, inputType) => {
        const originalValue = responses[fieldName]?.data?.[traineeId];
        
        setResponses(currentResponses => {
            const newResponses = JSON.parse(JSON.stringify(currentResponses)); // Deep copy for safety

            const updateAndRecalculateCompletion = (field, trainee, val) => {
                const gridData = newResponses[field]?.data || {};
                gridData[trainee] = val;

                let isComplete = false;
                if (field.includes('signature')) {
                    isComplete = trainees.every(t => {
                        const status = gridData[t.id];
                        return status === 'absent' || status === 'skip' || (typeof status === 'string' && status.startsWith('data:image'));
                    });
                } else {
                    isComplete = trainees.every(t => gridData[t.id] !== undefined && String(gridData[t.id]).trim() !== '');
                }

                newResponses[field] = { ...(newResponses[field] || {}), data: gridData, completed: isComplete };
                debouncedGridSave(field, gridData, isComplete);
    };
    
            updateAndRecalculateCompletion(fieldName, traineeId, value);
            
            if (inputType === 'signature_grid') {
                const dayNumber = parseInt(fieldName.split('_')[1], 10);

                const allSignatureQuestions = questions
                    .filter(q => q.input_type === 'signature_grid')
                    .sort((a, b) => parseInt(a.field_name.split('_')[1], 10) - parseInt(b.field_name.split('_')[1], 10));

                if (value === 'absent') {
                    allSignatureQuestions.forEach(q => {
                        const questionDay = parseInt(q.field_name.split('_')[1], 10);
                        if (questionDay > dayNumber) {
                            updateAndRecalculateCompletion(q.field_name, traineeId, 'absent');
                        }
                    });
                } else if (originalValue === 'absent') {
                    allSignatureQuestions.forEach(q => {
                        const questionDay = parseInt(q.field_name.split('_')[1], 10);
                        if (questionDay > dayNumber && (newResponses[q.field_name]?.data?.[traineeId] === 'absent')) {
                            // If the user was marked absent and is now being signed in, clear subsequent 'absent' marks
                                updateAndRecalculateCompletion(q.field_name, traineeId, '');
                        }
                    });
                }
            }
            
            return newResponses;
        });
    };

    const handleInputChange = (fieldName, value, inputType) => {
        let isComplete;
        if (inputType === 'tri_toggle') {
            isComplete = value !== 'neutral';
        } else {
            isComplete = inputType === 'checkbox' ? value : !!String(value).trim();
        }

        const newResponses = { ...responses, [fieldName]: { ...responses[fieldName], data: value, completed: isComplete } };
        setResponses(newResponses);
    
        const valueToSave = inputType === 'checkbox' ? String(value) : value;
        debouncedSave(fieldName, valueToSave, isComplete);
    };

    const handleCommentChange = (fieldName, comments) => {
        const newResponses = { ...responses, [fieldName]: { ...responses[fieldName], comments: comments } };
        setResponses(newResponses);
        debouncedCommentSave(fieldName, comments);
    };

    const toggleComment = (fieldName) => {
        setOpenComments(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };
    
    // Centralized calculation for progress
    const progress = useMemo(() => {
        const fieldsToExclude = ['trainer_comments', 'trainer_signature', 'admin_comments', 'admin_signature'];
        
        const relevantQuestions = questions.filter(q => {
            // Exclude the non-required footer fields from the calculation
            if (fieldsToExclude.includes(q.field_name)) {
                return false;
            }

            // Filter out attendance grids for days beyond the event duration
            if (q.input_type === 'attendance_grid' || q.input_type === 'signature_grid') {
                const dayNumber = parseInt(q.field_name.split('_')[1], 10);
                return !isNaN(dayNumber) && dayNumber <= (eventDetails.duration || 0);
            }
            // Add other filtering for conditional questions if needed
            return true;
        });

        if (relevantQuestions.length === 0) return 100;

        const completedCount = relevantQuestions.filter(q => {
            const response = responses[q.field_name];
            if (!response) return false;
            
            // Re-using the logic from handleGridInputChange for consistency
            if (q.input_type.includes('_grid')) {
                return response.completed; // The completed flag is now correctly set by handlers
            }

            if (q.input_type === 'checkbox') return response.data === true;
            if (q.input_type === 'tri_toggle') return response.data !== 'neutral';
            
            return response.data && String(response.data).trim() !== '';
        }).length;

        return Math.round((completedCount / relevantQuestions.length) * 100);
    }, [questions, responses, trainees, eventDetails]);

    // Effect to report progress whenever it changes
    useEffect(() => {
        if (onProgressUpdate) {
            onProgressUpdate(documentId, progress);
        }
    }, [progress, documentId, onProgressUpdate]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

    const handleGenerateAndCache = () => {
        // Validation for paired comment/signature fields
        const trainerComment = responses.trainer_comments?.data?.trim();
        const trainerSig = responses.trainer_signature?.data?.trim();
        if (trainerComment && !trainerSig) {
            alert('Trainer signature is required when a trainer comment is present.');
            return;
        }

        const adminComment = responses.admin_comments?.data?.trim();
        const adminSig = responses.admin_signature?.data?.trim();
        if (adminComment && !adminSig) {
            alert('Admin signature is required when an admin comment is present.');
            return;
        }

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

    const handleCompetencyInputChange = (fieldName, traineeId, competencyId, value) => {
        const currentGridData = responses[fieldName]?.data || {};
        const currentTraineeData = currentGridData[traineeId] || {};
        const updatedTraineeData = { ...currentTraineeData, [competencyId]: value };
        const updatedGridData = { ...currentGridData, [traineeId]: updatedTraineeData };
    
        const isComplete = trainees.every(t => {
            const traineeData = updatedGridData[t.id];
            if (!traineeData) return false;
            return competencies.every(c => traineeData[c.id] && String(traineeData[c.id]).trim() !== '');
        });
    
        const newResponses = {
            ...responses,
            [fieldName]: { ...responses[fieldName], data: updatedGridData, completed: isComplete }
        };
        setResponses(newResponses);
    
        const valueToSave = JSON.stringify(updatedGridData);
        debouncedSave(fieldName, valueToSave, isComplete);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">{eventDetails.courseName}</h2>
                    <p className="text-sm text-gray-600">{documentDetails.name} — {formatDate(eventDetails.start_date)}</p>
                </div>
                <div className="w-1/4">
                    <p className="font-bold text-sm text-right mb-1">Completion: {progress}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
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
                                                        placeholder={'Initials...'}
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

                            if (q.input_type === 'trainee_yes_no_grid') {
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
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }

                            if (q.input_type === 'signature_grid') {
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
                                            {trainees.map(trainee => {
                                                const dayNumber = parseInt(q.field_name.split('_')[1], 10);
                                                let isLockedDueToAbsence = false;

                                                for (let i = 1; i < dayNumber; i++) {
                                                    const prevFieldName = `day_${i}_attendance`;
                                                        const prevDayResponse = responses[prevFieldName]?.data?.[trainee.id];
                                                        if (prevDayResponse === 'absent') {
                                                            isLockedDueToAbsence = true;
                                                            break;
                                                    }
                                                }

                                                const traineeValue = isLockedDueToAbsence ? 'absent' : (responses[q.field_name]?.data?.[trainee.id] || '');
                                                
                                                let statusText = '';
                                                let isDayOpen = false;

                                                if (eventDetails.start_date) {
                                                    const now = new Date();
                                                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                                                    const [year, month, day] = eventDetails.start_date.split('-').map(Number);
                                                    const courseStartDate = new Date(year, month - 1, day);

                                                    const targetDate = new Date(courseStartDate);
                                                    targetDate.setDate(courseStartDate.getDate() + dayNumber - 1);
                                                    const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

                                                    if (targetDateOnly < today) {
                                                        statusText = 'Closed';
                                                    } else if (targetDateOnly > today) {
                                                        statusText = `Opens on ${targetDate.toLocaleDateString('en-GB')}`;
                                                    } else { // Date is today
                                                        const currentHour = now.getHours();
                                                        const isWithinTime = currentHour >= 9 && currentHour < 15;

                                                        if (isWithinTime) {
                                                            isDayOpen = true;
                                                        } else if (currentHour >= 15) {
                                                            statusText = 'Closed';
                                                        } else { // currentHour < 9
                                                            statusText = `Opens at 9:00 AM`;
                                                        }
                                                    }
                                                }

                                                if (user.role === 'dev') {
                                                    isDayOpen = true;
                                                    if (statusText) statusText += ' (Dev Override)';
                                                }
                                                
                                                const isEditableForThisCell = isEditable && !isLockedDueToAbsence;
                                                const isSigned = typeof traineeValue === 'string' && traineeValue.startsWith('data:image');

                                                return (
                                                    <div key={trainee.id} className="flex flex-col items-center space-y-2 p-2 border rounded-lg">
                                                        <label className="text-sm font-medium text-gray-700 w-full text-center truncate" title={`${trainee.forename} ${trainee.surname}`}>
                                                            {trainee.forename} {trainee.surname}
                                                        </label>

                                                        <div 
                                                            className={`w-full h-20 border rounded-md flex justify-center items-center ${isEditableForThisCell && isDayOpen ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-200 cursor-not-allowed'}`}
                                                                onClick={() => {
                                                                if (isEditableForThisCell && isDayOpen && !isSigned) {
                                                                    const onSave = (dataUrl) => handleGridInputChange(q.field_name, trainee.id, dataUrl, q.input_type);
                                                                    openSignatureModal(onSave, traineeValue);
                                                                    }
                                                                }}
                                                            >
                                                                {isSigned ? (
                                                                <img src={traineeValue} alt="Signature" className="h-full w-full object-contain" />
                                                            ) : (
                                                                    <span className="text-gray-500 text-sm capitalize">
                                                                    {traineeValue === 'absent' && 'Absent'}
                                                                    {traineeValue === 'skip' && 'Skipped'}
                                                                    {traineeValue !== 'absent' && traineeValue !== 'skip' && 'Click to Sign'}
                                                                    </span>
                                                                )}
                                                        </div>

                                                        <div className="w-full">
                                                                <select
                                                                value={isSigned ? 'signed' : traineeValue}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    // Allow clearing the signature if "Present" is chosen, or setting other statuses
                                                                    if (value === '' || value === 'absent' || value === 'skip') {
                                                                         handleGridInputChange(q.field_name, trainee.id, value, q.input_type);
                                                                    }
                                                                }}
                                                                className="w-full p-1 border rounded-md text-sm"
                                                                disabled={!isEditableForThisCell || !isDayOpen}
                                                                >
                                                                    {isSigned ? (
                                                                        <option value="signed">Signed</option>
                                                                    ) : (
                                                                    <option value="">Present</option>
                                                                )}
                                                                    <option value="absent">Absent</option>
                                                                    <option value="skip">Skip</option>
                                                                </select>
                                                            </div>

                                                        {statusText && <p className="text-xs text-gray-500 mt-1 w-full text-center">{statusText}</p>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            }

                            if (q.input_type === 'time_capture_button') {
                                const isEditable = canUserEdit(q.access, user.role);
                                const responseValue = responses[q.field_name]?.data || '';
                            
                                let isDisabled = !isEditable;
                                if (q.field_name === 'finish_time') {
                                    const startTimeResponse = responses['start_time']?.data;
                                    if (!startTimeResponse) {
                                        isDisabled = true;
                                    }
                                }
                            
                                const handleTimeCapture = () => {
                                    const now = new Date();
                                    const hours = String(now.getHours()).padStart(2, '0');
                                    const minutes = String(now.getMinutes()).padStart(2, '0');
                                    const currentTime = `${hours}:${minutes}`;
                                    handleInputChange(q.field_name, currentTime, q.input_type);
                                };
                            
                                return (
                                    <div key={q.id} className={`flex items-center justify-between py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                        <span className="text-gray-700 font-medium">{q.question_text}</span>
                                        <div className="flex items-center space-x-4">
                                            {responseValue ? (
                                                <>
                                                    <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded-md">{responseValue}</span>
                                                    <button
                                                        onClick={() => handleInputChange(q.field_name, '', q.input_type)}
                                                        className="text-xs text-red-500 hover:text-red-700"
                                                        disabled={!isEditable}
                                                    >
                                                        Clear
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={handleTimeCapture}
                                                    className={`px-4 py-2 text-sm rounded ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                                    disabled={isDisabled}
                                                >
                                                    Record {q.question_text}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
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
                                            {q.input_type === 'tri_toggle' && (
                                                <TriToggleButton
                                                    value={responses[q.field_name]?.data || 'neutral'}
                                                    onChange={(newValue) => handleInputChange(q.field_name, newValue, q.input_type)}
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'checklist' && (
                                                <select
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, 'checklist')}
                                                    className="p-1 border rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                    disabled={!isEditable}
                                                >
                                                    <option value="">Select...</option>
                                                    {(questionOptions[q.field_name] || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {q.input_type === 'date' && (
                                                <input
                                                    type="date"
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, 'date')}
                                                    className="p-2 border rounded-md shadow-sm w-full"
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'time' && (
                                                <input
                                                    type="time"
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, 'time')}
                                                    className="p-2 border rounded-md shadow-sm w-full"
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'number' && (
                                                <input
                                                    type="number"
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, 'number')}
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
                                            {q.input_type === 'textarea' && (
                                                <textarea
                                                    value={responses[q.field_name]?.data || ''}
                                                    onChange={(e) => handleInputChange(q.field_name, e.target.value, q.input_type)}
                                                    className="p-2 border rounded-md w-full disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                    rows="3"
                                                    disabled={!isEditable}
                                                />
                                            )}
                                            {q.input_type === 'signature_box' && (
                                                <div 
                                                    className={`w-48 h-24 border rounded-md flex justify-center items-center ${isEditable ? 'cursor-pointer hover:bg-gray-100' : 'bg-gray-200 cursor-not-allowed'}`}
                                                    onClick={() => {
                                                        if (isEditable) {
                                                            const signatureData = responses[q.field_name]?.data || '';
                                                            const onSave = (dataUrl) => {
                                                                handleInputChange(q.field_name, dataUrl, q.input_type);
                                                            };
                                                            openSignatureModal(onSave, signatureData);
                                                        }
                                                    }}
                                                >
                                                    {responses[q.field_name]?.data ? (
                                                        <img src={responses[q.field_name].data} alt="Signature" className="h-full w-full object-contain" />
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">Click to Sign</span>
                                                    )}
                                                </div>
                                            )}
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
                        disabled={progress < 100}
                    >
                        {pdfButtonText}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionnaireForm; 