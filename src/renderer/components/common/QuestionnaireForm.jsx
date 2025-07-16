import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TriToggleButton from './TriToggleButton';
import UploadQuestion from './UploadQuestion';
import { useEvent } from '../../context/EventContext';

const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
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

const canUserEdit = (questionAccess, userRole) => {
    if (userRole === 'dev') return true;
    if (userRole === 'admin' && questionAccess === 'admin') return true;
    if (userRole === 'trainer' && questionAccess === 'trainer') return true;
    return false;
};

const getFileNameHint = (docDetails, event, trainee, allowMultiple = false) => {
    if (!docDetails || !event) return '';

    const docName = docDetails.name.replace(/\s+/g, '_');
    let baseName = '';
    
    // Using the 'save' path to determine the context for the file name
    if (docDetails.save.startsWith('Candidates/')) {
            if (trainee) {
                baseName = `${trainee.forename}_${trainee.surname}_${docName}`;
            } else {
            baseName = `TraineeFirstName_TraineeLastName_${docName}`;
        }
    } else { // Assumes Admin or Course level
            if(event.courseName) {
                const courseName = event.courseName.replace(/\s+/g, '_');
                baseName = `${courseName}_${docName}`;
            } else {
            baseName = `CourseName_${docName}`;
        }
    }

    return `Required name: ${baseName}${allowMultiple ? '_Part_X' : ''}`;
};

const QuestionnaireForm = ({ 
    user, 
    eventDetails: propEventDetails, 
    documentDetails, 
    openSignatureModal, 
    showPdfButton = true, 
    valueColumnHeader = 'Value', 
    hideCompletedColumn = false,
    onSaveSuccess,
    selectedTraineeId 
}) => {
    const { activeEvent } = useEvent();
    const eventDetails = propEventDetails || activeEvent;
    
    const [questions, setQuestions] = useState([]);
    const [responses, setResponses] = useState({});
    const [openComments, setOpenComments] = useState({});
    const [questionOptions, setQuestionOptions] = useState({});
    const [trainees, setTrainees] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
    
    const [completionPercentage, setCompletionPercentage] = useState(0);
    
    const { datapackId, documentId } = useMemo(() => ({
        datapackId: eventDetails?.id,
        documentId: documentDetails?.id
    }), [eventDetails, documentDetails]);

    const hasUploadQuestion = useMemo(() => questions.some(q => q.input_type === 'upload'), [questions]);
    const selectedTrainee = useMemo(() => {
        if (!selectedTraineeId || !eventDetails?.trainees?.length) return null;
        return eventDetails.trainees.find(t => t.id === parseInt(selectedTraineeId, 10));
    }, [selectedTraineeId, eventDetails?.trainees]);

    useEffect(() => {
        const initializeForm = async () => {
            if (!documentId || !datapackId) return;

            // Fetch questions
            const fetchedQuestions = await window.db.query('SELECT * FROM questionnaires WHERE document_id = ?', [documentId]);
            setQuestions(fetchedQuestions);

            // Fetch options for dropdowns
            const dropdownFieldNames = fetchedQuestions.filter(q => q.input_type.includes('dropdown')).map(q => q.field_name);
            if (dropdownFieldNames.length > 0) {
                const placeholders = dropdownFieldNames.map(() => '?').join(',');
                const allOptions = await window.db.query(`SELECT question_field_name, option_value FROM questionnaire_options WHERE question_field_name IN (${placeholders})`, dropdownFieldNames);
                const options = allOptions.reduce((acc, opt) => {
                    if (!acc[opt.question_field_name]) acc[opt.question_field_name] = [];
                    acc[opt.question_field_name].push(opt.option_value);
                    return acc;
                }, {});
                setQuestionOptions(options);
            }

            // Fetch and initialize responses
            const initialResponses = {};
            for (const q of fetchedQuestions) {
                const res = await window.db.query('SELECT * FROM responses WHERE datapack_id = ? AND document_id = ? AND field_name = ?', [datapackId, documentId, q.field_name]);
                if (res.length > 0) {
                let parsedData;
                    try {
                        parsedData = JSON.parse(res[0].response_data);
                    } catch (e) {
                        parsedData = res[0].response_data;
                    }
                    initialResponses[q.field_name] = { data: parsedData, completed: !!res[0].completed, comments: res[0].additional_comments || '' };
                } else {
                    const initialData = q.input_type === 'upload' ? [] : q.input_type === 'tri_toggle' ? 'neutral' : '';
                    initialResponses[q.field_name] = { data: initialData, completed: false, comments: '' };
                }
            }
            setResponses(initialResponses);
        };
        initializeForm();
    }, [documentId, datapackId]);

    useEffect(() => {
        if (questions.length === 0) return;
    
        const completedQuestions = questions.filter(q => {
            const response = responses[q.field_name];
            if (!response) return false;
    
            if (q.input_type === 'upload') {
                // Considered complete if there is at least one file, staged or uploaded
                return Array.isArray(response.data) && response.data.length > 0;
            }
            // For other types, rely on the completed flag, which is updated in handleInputChange
            return response.completed;
        });
    
        const percentage = questions.length > 0 ? (completedQuestions.length / questions.length) * 100 : 0;
        setCompletionPercentage(Math.round(percentage));
    }, [responses, questions]);


    const handleSave = async () => {
        setSaveStatus({ message: 'Saving...', type: 'loading' });
    
        const newResponsesState = JSON.parse(JSON.stringify(responses));
        const uploadPromises = [];
    
        for (const fieldName in newResponsesState) {
            const question = questions.find(q => q.field_name === fieldName);
            if (!question || question.input_type !== 'upload') continue;
    
            const filesToUpload = (newResponsesState[fieldName].data || []).filter(file => file.status === 'staged');
            filesToUpload.forEach(file => {
                uploadPromises.push(
                    window.electron.uploadFileToBlob({
                        fileData: file.data,
                        fileName: file.name,
                eventDetails,
                documentDetails,
                        traineeDetails: selectedTrainee,
                    }).then(url => ({
                        fieldName,
                        originalFileName: file.name,
                        url,
                    })).catch(error => ({
                        fieldName,
                        originalFileName: file.name,
                        error,
                    }))
                );
            });
        }
    
        const uploadResults = await Promise.all(uploadPromises);
        const failedUploads = uploadResults.filter(r => r.error);
    
        if (failedUploads.length > 0) {
            const errorMsg = `Failed to upload: ${failedUploads.map(f => f.originalFileName).join(', ')}. Please try again.`;
            setSaveStatus({ message: errorMsg, type: 'error' });
            setTimeout(() => setSaveStatus({ message: '', type: '' }), 5000);
            return;
        }
    
        uploadResults.forEach(({ fieldName, originalFileName, url }) => {
            const fileIndex = newResponsesState[fieldName].data.findIndex(f => f.name === originalFileName && f.status === 'staged');
            if (fileIndex !== -1) {
                newResponsesState[fieldName].data[fileIndex] = { name: originalFileName, url, status: 'uploaded' };
            }
        });
    
        try {
            const dbTransaction = Object.entries(newResponsesState).map(([fieldName, response]) => {
                const valueToSave = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data;
                const isComplete = response.completed ? 1 : 0;
                return [
                    'INSERT OR REPLACE INTO responses (datapack_id, document_id, field_name, response_data, completed, additional_comments) VALUES (?, ?, ?, ?, ?, ?)',
                    [datapackId, documentId, fieldName, valueToSave, isComplete, response.comments || '']
                ];
            });

            await window.db.transaction(dbTransaction);
            setResponses(newResponsesState);
            setSaveStatus({ message: 'Saved successfully!', type: 'success' });

            await window.electron.recalculateAndUpdateProgress({ datapackId, documentId, traineeId: selectedTraineeId });

            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (dbError) {
            console.error('Database save failed:', dbError);
            setSaveStatus({ message: 'Database save failed.', type: 'error' });
        } finally {
            setTimeout(() => setSaveStatus({ message: '', type: '' }), 3000);
        }
    };

    const handleInputChange = (fieldName, value, inputType) => {
        const question = questions.find(q => q.field_name === fieldName);
        let completed = false;
        
        if (inputType === 'upload') {
            completed = Array.isArray(value) && value.some(f => f.status === 'uploaded' || f.status === 'staged');
        } else if (typeof value === 'boolean') {
            completed = value;
        } else if (typeof value === 'string' || typeof value === 'number') {
            completed = !!value;
        } else if (typeof value === 'object' && value !== null) {
            completed = Object.keys(value).length > 0;
        }

        setResponses(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], data: value, completed }
        }));
    };

    const handleCommentChange = (fieldName, comments) => {
        setResponses(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], comments }
        }));
    };

    const toggleComment = (fieldName) => {
        setOpenComments(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };
    
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

    const groupedQuestions = useMemo(() => {
        return questions.reduce((acc, q) => {
            const section = q.section || 'General';
            if (!acc[section]) acc[section] = [];
            acc[section].push(q);
            return acc;
        }, {});
    }, [questions]);

    // Fallback for missing details
    if (!eventDetails || !documentDetails) {
        return <div className="p-4">Loading form...</div>;
    }
    const { courseName, start_date } = eventDetails;
    const { name: docName } = documentDetails;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">{courseName}</h2>
                    <p className="text-sm text-gray-600">{docName} — {start_date ? formatDate(start_date) : 'N/A'}</p>
                </div>
            </div>

            {Object.entries(groupedQuestions).map(([section, qs]) => (
                <div key={section}>
                    {section !== 'General' && qs.length > 0 && <h3 className="text-md font-bold text-gray-500 mb-2 mt-4">{section}</h3>}
                    <div className="space-y-3 p-4">
                         {qs.map((q) => {
                                     const isEditable = canUserEdit(q.access, user.role);
                            const response = responses[q.field_name] || { data: q.input_type === 'upload' ? [] : '', completed: false, comments: '' };
                            
                            if (q.input_type === 'upload') {
                                     return (
                                    <div key={q.id} className={`py-3 ${!isEditable ? 'opacity-60' : ''}`}>
                                             <div className="flex items-start justify-between">
                                             {qs.length > 1 && <div className="w-1/3 pt-1"><span className="text-gray-700 font-medium">{q.question_text}</span></div> }
                                             <div className="w-full">
                                                     <UploadQuestion
                                                         question={q}
                                                    value={response.data}
                                                         onChange={(value) => handleInputChange(q.field_name, value, q.input_type)}
                                                         disabled={!isEditable}
                                                         documentDetails={documentDetails}
                                                         fileNameHint={getFileNameHint(documentDetails, eventDetails, selectedTrainee, q.allow_multiple)}
                                                         eventDetails={eventDetails}
                                                         selectedTrainee={selectedTrainee}
                                                     />
                                                 </div>
                                             </div>
                                         </div>
                                     );
                                 }
                            
                            const commentOpen = !!openComments[q.field_name];
                            return (
                                <div key={q.id} className={`flex flex-col py-3 border-t ${!isEditable ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className={`${hideCompletedColumn ? "w-4/5" : "w-3/5"} flex items-center`}>
                                            <span className="text-gray-700 font-medium">{q.question_text}</span>
                                            {q.has_comments === 'YES' && isEditable && (
                                                <button onClick={() => toggleComment(q.field_name)} className="ml-4 text-xs text-blue-500 hover:underline">
                                                    {commentOpen ? 'Cancel' : 'Add Comment'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {!hideCompletedColumn && <div className="w-1/5 flex justify-center">
                                            {response.completed && (
                                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            )}
                                        </div>}
 
                                        <div className="w-1/5 flex justify-center">
                                            {q.input_type === 'checkbox' && (
                                                <input type="checkbox" checked={!!response.data} onChange={(e) => handleInputChange(q.field_name, e.target.checked, q.input_type)} className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500" disabled={!isEditable} />
                                            )}
                                            {q.input_type === 'tri_toggle' && (
                                                <TriToggleButton value={response.data || 'neutral'} onChange={(newValue) => handleInputChange(q.field_name, newValue, q.input_type)} disabled={!isEditable} />
                                            )}
                                            {q.input_type === 'dropdown' && (
                                                <select value={response.data || ''} onChange={(e) => handleInputChange(q.field_name, e.target.value, q.input_type)} className="p-2 border rounded-md w-48" disabled={!isEditable}>
                                                    <option value="">Select...</option>
                                                    {(questionOptions[q.field_name] || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                    {q.has_comments === 'YES' && commentOpen && (
                                        <div className="mt-3">
                                            <textarea value={response.comments} onChange={(e) => handleCommentChange(q.field_name, e.target.value)} placeholder="Add comments..." className="w-full p-2 border rounded-md" rows="2" disabled={!isEditable} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            
            <div className="pt-4 flex justify-end items-center space-x-4">
                {saveStatus.message && (
                    <span className={`text-sm font-medium ${saveStatus.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                        {saveStatus.message}
                    </span>
                )}
                    <button 
                    onClick={handleSave}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={saveStatus.type === 'loading' || completionPercentage < 100}
                    title={`Save ${docName}`}
                >
                    {saveStatus.type === 'loading' ? 'Saving...' : `Save ${docName}`}
                    </button>
            </div>
        </div>
    );
};

export default QuestionnaireForm; 