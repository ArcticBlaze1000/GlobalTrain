import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import TriToggleButton from './TriToggleButton';

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const parseDeviation = (deviationStr) => {
    if (!deviationStr) return 0;
    const sign = deviationStr.startsWith('-') ? -1 : 1;
    const hoursMatch = deviationStr.match(/(\d+)h/);
    const minsMatch = deviationStr.match(/(\d+)m/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    return sign * (hours * 60 + mins);
};

const formatDeviation = (minutes) => {
    if (minutes === 0) return "0m";
    const sign = minutes > 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    let result = `${sign}`;
    if (hours > 0) result += `${hours}h `;
    if (mins > 0) result += `${mins}m`;
    return result.trim();
};

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

const QuestionnaireForm = ({ user, eventDetails, documentDetails, openSignatureModal, showPdfButton = true, pdfButtonText = "Generate PDF", onPdfButtonClick, valueColumnHeader = "Yes/No", selectedTraineeId, onDeviationUpdate }) => {
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
                } else if (q.input_type === 'attendance_grid' || q.input_type === 'trainee_checkbox_grid' || q.input_type === 'trainee_date_grid' || q.input_type === 'trainee_dropdown_grid' || q.input_type === 'competency_grid' || q.input_type === 'trainee_yes_no_grid' || q.input_type === 'signature_grid' || q.input_type === 'dynamic_comments_section') {
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
    
    const triggerRecalculation = useCallback(() => {
        window.electron.recalculateAndUpdateProgress({
            datapackId,
            documentId,
            traineeId: documentDetails.scope === 'candidate' ? selectedTraineeId : null,
        });
    }, [datapackId, documentId, selectedTraineeId, documentDetails.scope]);

    const debouncedSave = useCallback(debounce(async (fieldName, value) => {
        await window.db.run(
            'UPDATE responses SET response_data = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [value, datapackId, documentId, fieldName]
        );
        triggerRecalculation();
    }, 500), [datapackId, documentId, triggerRecalculation]);

    const debouncedCommentSave = useCallback(debounce(async (fieldName, comments) => {
        await window.db.run(
            'UPDATE responses SET additional_comments = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [comments, datapackId, documentId, fieldName]
        );
    }, 500), [datapackId, documentId]);

    const debouncedGridSave = useCallback(debounce(async (fieldName, gridData) => {
        await window.db.run(
            'UPDATE responses SET response_data = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
            [JSON.stringify(gridData), datapackId, documentId, fieldName]
        );
        triggerRecalculation();
    }, 500), [datapackId, documentId, triggerRecalculation]);

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

    const [newComment, setNewComment] = useState('');

    const handleDynamicCommentChange = (fieldName, part, value) => {
        const currentData = responses[fieldName]?.data || { comments: [], signature: '' };
        const newData = { ...currentData, [part]: value };

        const newResponses = { ...responses, [fieldName]: { ...responses[fieldName], data: newData } };
        setResponses(newResponses);

        const valueToSave = JSON.stringify(newData);
        debouncedSave(fieldName, valueToSave);
    };
    
    const handleGridInputChange = (fieldName, traineeId, value, inputType) => {
        const originalValue = responses[fieldName]?.data?.[traineeId];
        // Create a mutable copy of the responses state to stage all UI changes
        const newResponses = JSON.parse(JSON.stringify(responses));

        // A list to keep track of all database updates to perform
        const updatesToSave = [];

        // Helper to stage an update for a grid cell.
        // This updates the local 'newResponses' object for an immediate UI update.
        // It also adds the change to a queue to be saved to the database.
        const stageUpdate = (field, trainee, val) => {
            const gridData = newResponses[field]?.data || {};
            gridData[trainee] = val;
            newResponses[field] = { ...(newResponses[field] || {}), data: gridData };
            updatesToSave.push({ field, gridData });
        };

        // Stage the update that was directly changed by the user
        stageUpdate(fieldName, traineeId, value);

        // If it's a signature grid, handle the cascading "absent" logic
        if (inputType === 'signature_grid') {
            const dayNumberMatch = fieldName.match(/day_(\d+)_/);
            if (dayNumberMatch) {
                const currentDay = parseInt(dayNumberMatch[1], 10);
                const allSignatureQuestions = questions
                    .filter(q => q.input_type === 'signature_grid' && q.field_name.startsWith('day_'))
                    .sort((a, b) => parseInt(a.field_name.match(/day_(\d+)_/)[1], 10) - parseInt(b.field_name.match(/day_(\d+)_/)[1], 10));

                // If trainee is marked absent, mark all subsequent days as absent
                if (value === 'absent') {
                    allSignatureQuestions.forEach(q => {
                        const day = parseInt(q.field_name.match(/day_(\d+)_/)[1], 10);
                        if (day > currentDay) {
                           stageUpdate(q.field_name, traineeId, 'absent');
                        }
                    });
                // If trainee was absent but is now present/signed, clear subsequent auto-filled absent marks
                } else if (originalValue === 'absent') {
                    allSignatureQuestions.forEach(q => {
                        const day = parseInt(q.field_name.match(/day_(\d+)_/)[1], 10);
                        if (day > currentDay && newResponses[q.field_name]?.data?.[traineeId] === 'absent') {
                            // Clear the value to 'Present'
                            stageUpdate(q.field_name, traineeId, '');
                        }
                    });
                }
            }
        }

        // Update the React state immediately for UI responsiveness
        setResponses(newResponses);

        // Asynchronously save all staged updates to the database
        const saveAllUpdates = async () => {
            // Use a Map to ensure we only save the final state for each field,
            // preventing redundant writes if a field were updated multiple times in the logic.
            const finalUpdates = new Map();
            for (const update of updatesToSave) {
                finalUpdates.set(update.field, update.gridData);
            }

            for (const [field, gridData] of finalUpdates.entries()) {
                await window.db.run(
                    'UPDATE responses SET response_data = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?',
                    [JSON.stringify(gridData), datapackId, documentId, field]
                );
            }

            // Trigger a single recalculation after all updates are done
            if (finalUpdates.size > 0) {
                triggerRecalculation();
            }
        };

        // Fire and forget the save operation
        saveAllUpdates();
    };

    const handleInputChange = (fieldName, value, inputType) => {
        let responseData;
        if (inputType === 'checkbox') {
            responseData = value;
        } else {
            responseData = value;
        }

        const newResponses = {
            ...responses,
            [fieldName]: {
                ...responses[fieldName],
                data: responseData
            }
        };
        setResponses(newResponses);

        const valueToSave = inputType === 'checkbox' ? String(responseData) : responseData;
        debouncedSave(fieldName, valueToSave);
    };

    const handleCommentChange = (fieldName, comments) => {
        const newResponses = { ...responses, [fieldName]: { ...responses[fieldName], comments: comments } };
        setResponses(newResponses);
        debouncedCommentSave(fieldName, comments);
    };

    const toggleComment = (fieldName) => {
        setOpenComments(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };
    
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

    const processedGroupedQuestions = useMemo(() => {
        const newGroupedQuestions = {};
        for (const [section, qs] of Object.entries(groupedQuestions)) {
            if (section.startsWith('Day ')) {
                const newQs = [];
                for (let i = 0; i < qs.length; i++) {
                    const q = qs[i];
                    if (q.input_type === 'time_capture_button' && q.field_name.includes('_start_time')) {
                        const finishQ = qs[i + 1];
                        if (finishQ && finishQ.input_type === 'time_capture_button' && finishQ.field_name.includes('_finish_time')) {
                            newQs.push({
                                id: q.id,
                                input_type: 'daily_time_pair',
                                startQuestion: q,
                                finishQuestion: finishQ,
                            });
                            i++; // Skip the next item as it's been paired
                        } else {
                            newQs.push(q);
                        }
                    } else {
                        newQs.push(q);
                    }
                }
                newGroupedQuestions[section] = newQs;
            } else {
                newGroupedQuestions[section] = qs;
            }
        }
        return newGroupedQuestions;
    }, [groupedQuestions]);

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
        debouncedSave(fieldName, valueToSave);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">{eventDetails.courseName}</h2>
                    <p className="text-sm text-gray-600">{documentDetails.name} — {formatDate(eventDetails.start_date)}</p>
                </div>
            </div>

            {Object.entries(processedGroupedQuestions).map(([section, qs]) => {
                if (section.startsWith('Day ')) {
                    const dayNumber = parseInt(section.split(' ')[1], 10);
                    if (!eventDetails?.duration || dayNumber > eventDetails.duration) {
                        return null; // Don't render days beyond the course duration
                    }
                }

                return (
                <div key={section}>
                    {section !== 'General' && <h3 className="text-md font-bold text-gray-500 mb-2 mt-4">{section}</h3>}
                    <div className="space-y-3 p-4">
                        {/* Header Row */}
                            {section !== 'Comments' && !section.startsWith('Day ') && (
                        <div className="flex items-center justify-between font-bold text-gray-500 text-sm">
                            <span className="w-3/5">Item</span>
                            <span className="w-1/5 text-center">Completed</span>
                            <span className="w-1/5 text-center">{valueColumnHeader}</span>
                        </div>
                            )}
                        
                        {qs.map((q) => {
                                if (q.input_type === 'daily_time_pair') {
                                    const { startQuestion, finishQuestion } = q;
                                    const isEditable = canUserEdit(startQuestion.access, user.role);
                                    const startTimeValue = responses[startQuestion.field_name]?.data || '';
                                    const finishTimeValue = responses[finishQuestion.field_name]?.data || '';
                                    
                                    const dayNumberMatch = startQuestion.field_name.match(/day_(\d+)_/);
                                    const dayNumber = dayNumberMatch ? parseInt(dayNumberMatch[1], 10) : 0;

                                    let isLockedByTime = false;
                                    let statusText = '';
                                    if (dayNumber > 0 && eventDetails.start_date) {
                                        const now = new Date();
                                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                        const [year, month, day] = eventDetails.start_date.split('-').map(Number);
                                        const courseStartDate = new Date(year, month - 1, day);
                                        const targetDate = new Date(courseStartDate);
                                        targetDate.setDate(courseStartDate.getDate() + dayNumber - 1);
                                        const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

                                        if (targetDateOnly < today) isLockedByTime = true;
                                        else if (targetDateOnly > today) isLockedByTime = true;
                                        else if (new Date().getHours() >= 18) isLockedByTime = true;
                                    }

                                    if (user.role === 'dev') isLockedByTime = false;

                                    const handleTimeCapture = (fieldName) => {
                                        const now = new Date();
                                        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                        handleInputChange(fieldName, currentTime, 'time_capture_button');
                                    };
                                    
                                    let deviationText = '';
                                    if (startTimeValue && finishTimeValue) {
                                        const startMinutes = parseTime(startTimeValue);
                                        const finishMinutes = parseTime(finishTimeValue);
                                        if (startMinutes !== null && finishMinutes !== null && finishMinutes >= startMinutes) {
                                            deviationText = formatDeviation((finishMinutes - startMinutes) - (6 * 60));
                                        }
                                    }

                                    return (
                                         <div key={q.id} className={`flex items-center justify-between py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                            <span className="w-2/5 font-medium text-gray-700">Start / Finish Time</span>
                                            <div className="w-3/5 flex justify-end items-center space-x-4">
                                                {/* Start Time */}
                                                {startTimeValue ? (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded-md">{startTimeValue}</span>
                                                        <button onClick={() => handleInputChange(startQuestion.field_name, '', 'time_capture_button')} className="text-xs text-red-500 hover:text-red-700" disabled={!isEditable || isLockedByTime}>Clear</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleTimeCapture(startQuestion.field_name)} className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300" disabled={!isEditable || isLockedByTime}>Record Start</button>
                                                )}

                                                {/* Finish Time */}
                                                {finishTimeValue ? (
                                                     <div className="flex items-center space-x-2">
                                                        <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded-md">{finishTimeValue}</span>
                                                        <button onClick={() => handleInputChange(finishQuestion.field_name, '', 'time_capture_button')} className="text-xs text-red-500 hover:text-red-700" disabled={!isEditable || isLockedByTime}>Clear</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleTimeCapture(finishQuestion.field_name)} className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300" disabled={!isEditable || isLockedByTime || !startTimeValue}>Record Finish</button>
                                                )}
                                                
                                                {deviationText && <span className="font-bold w-24 text-right">Deviation: {deviationText}</span>}
                                            </div>
                                        </div>
                                    );
                                }
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
                                    const isDailyTracking = /day_\d+_(start|finish)_time/.test(q.field_name);
                                    let statusText = '';
                                    let isLockedByTime = false;
                                    let deviationText = null;

                                    if (isDailyTracking) {
                                        const dayNumberMatch = q.field_name.match(/day_(\d+)_/);
                                        if (dayNumberMatch) {
                                            const dayNumber = parseInt(dayNumberMatch[1], 10);
                                            if (eventDetails.start_date) {
                                                const now = new Date();
                                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                                const [year, month, day] = eventDetails.start_date.split('-').map(Number);
                                                const courseStartDate = new Date(year, month - 1, day);
                                                const targetDate = new Date(courseStartDate);
                                                targetDate.setDate(courseStartDate.getDate() + dayNumber - 1);
                                                const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

                                                if (targetDateOnly < today) {
                                                    isLockedByTime = true;
                                                    statusText = 'Entry Closed (Past)';
                                                } else if (targetDateOnly > today) {
                                                    isLockedByTime = true;
                                                    statusText = `Opens on ${targetDate.toLocaleDateString('en-GB')}`;
                                                } else { // Date is today
                                                    const currentHour = now.getHours();
                                                    if (currentHour >= 18) {
                                                        isLockedByTime = true;
                                                        statusText = 'Entry Closed (Today)';
                                                    }
                                                }
                                            }
                                            if (user.role === 'dev') {
                                                isLockedByTime = false;
                                                if (statusText) statusText += ' (Dev Override)';
                                            }
                                        }
                                    }

                                    if (q.field_name.includes('_finish_time')) {
                                        const dayNumberMatch = q.field_name.match(/day_(\d+)_/);
                                        const baseFieldName = isDailyTracking && dayNumberMatch
                                            ? `day_${dayNumberMatch[1]}_start_time`
                                            : 'start_time';
                                        
                                        const startTimeResponse = responses[baseFieldName]?.data;
                                        if (!startTimeResponse) {
                                            isLockedByTime = true;
                                        } else {
                                            const startMinutes = parseTime(startTimeResponse);
                                            const finishMinutes = parseTime(responseValue);
                                            if (startMinutes !== null && finishMinutes !== null && finishMinutes >= startMinutes) {
                                                const deviation = (finishMinutes - startMinutes) - (6 * 60);
                                                deviationText = formatDeviation(deviation);
                                            }
                                        }
                                    }
                                
                                    let isDisabled = !isEditable || isLockedByTime;
                                    if (q.field_name.includes('_finish_time')) {
                                        const dayNumberMatch = q.field_name.match(/day_(\d+)_/);
                                        const baseFieldName = isDailyTracking && dayNumberMatch
                                            ? `day_${dayNumberMatch[1]}_start_time`
                                            : 'start_time';
                                        
                                        const startTimeResponse = responses[baseFieldName]?.data;
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
                                                {deviationText && <span className="font-bold text-sm">Deviation: {deviationText}</span>}
                                                {statusText && <span className="text-xs text-gray-500">{statusText}</span>}
                                            {responseValue ? (
                                                <>
                                                    <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded-md">{responseValue}</span>
                                                    <button
                                                        onClick={() => handleInputChange(q.field_name, '', q.input_type)}
                                                        className="text-xs text-red-500 hover:text-red-700"
                                                            disabled={!isEditable || isLockedByTime}
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

                                if (q.input_type === 'dynamic_comments_section') {
                                    const isEditable = canUserEdit(q.access, user.role);
                                    const responseData = responses[q.field_name]?.data || { comments: [], signature: '' };
                                    const comments = responseData.comments || [];
                                    const signature = responseData.signature || '';

                                    const handleAddComment = () => {
                                        if (newComment.trim()) {
                                            const updatedComments = [...comments, newComment.trim()];
                                            handleDynamicCommentChange(q.field_name, 'comments', updatedComments);
                                            setNewComment('');
                                        }
                                    };
                                    
                                    const onSaveSignature = (dataUrl) => {
                                        handleDynamicCommentChange(q.field_name, 'signature', dataUrl);
                                    };

                                    return (
                                        <div key={q.id} className={`py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                            <div className="space-y-4">
                                                {/* Display existing comments */}
                                                {comments.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-700">Logged Comments</h4>
                                                        <ol className="list-decimal list-inside pl-4 border p-2 rounded-md bg-gray-50">
                                                            {comments.map((comment, index) => (
                                                                <li key={index} className="text-gray-800">{comment}</li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                )}

                                                {/* Input for new comment */}
                                                <div className="flex items-start space-x-2">
                                                    <textarea
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder="Enter a new comment..."
                                                        className="w-full p-2 border rounded-md disabled:bg-gray-200"
                                                        rows="2"
                                                        disabled={!isEditable}
                                                    />
                                                    <button
                                                        onClick={handleAddComment}
                                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                                                        disabled={!isEditable || !newComment.trim()}
                                                    >
                                                        Add
                                                    </button>
                                                </div>

                                                {/* Signature area */}
                                                <div>
                                                    <h4 className="font-medium text-gray-700 mt-4">Trainer Signature</h4>
                                                     <div 
                                                        className={`w-full md:w-1/2 lg:w-1/3 h-32 border rounded-md flex justify-center items-center mt-2 ${isEditable ? 'cursor-pointer hover:bg-gray-100' : 'bg-gray-200 cursor-not-allowed'}`}
                                                        onClick={() => {
                                                            if (isEditable) {
                                                                openSignatureModal(onSaveSignature, signature);
                                                            }
                                                        }}
                                                    >
                                                        {signature ? (
                                                            <img src={signature} alt="Signature" className="h-full w-full object-contain" />
                                                        ) : (
                                                            <span className="text-gray-500 text-sm">Click to Sign</span>
                                                        )}
                                                    </div>
                                                </div>
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
                );
            })}
            
            {showPdfButton && (
                <div className="pt-4 flex justify-end">
                    <button 
                        onClick={handleGenerateAndCache}
                        className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                    >
                        {pdfButtonText}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionnaireForm; 