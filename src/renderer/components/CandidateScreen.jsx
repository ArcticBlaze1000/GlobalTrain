import React, { useState, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import Dropdown from './common/Dropdown';
import QuestionnaireForm from './common/QuestionnaireForm';
import PreCourseForm from './General/PreCourse/Form';
import PostCourseForm from './General/PostCourse/Form';
import LeavingForm from './General/LeavingForm/Form';
import PhoneticQuizForm from './PTS/PhoneticQuiz/Form';
import EmergencyPhoneCallExerciseForm from './PTS/EmergencyPhoneCallExercise/Form';
import PracticalAssessmentForm from './PTS/PracticalAssessment/Form';
import RecertEmergencyCallPracticalAssessmentForm from './PTS/RecertEmergencyCallPracticalAssessment/Form';

const formatDocName = (name) => {
    if (!name) return '';
    // Add a space before any capital letter that is preceded by a lowercase letter.
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const CandidateScreen = ({ user, openSignatureModal }) => {
    // Shared state from context
    const { activeEvent, progressState, updateProgress, updateBulkProgress } = useEvent();

    // State for data
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
    const [documents, setDocuments] = useState([]);

    // State for form controls
    const [selectedCandidateId, setSelectedCandidateId] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Derive progress for the currently selected candidate from the central state
    const docProgress = progressState[selectedCandidateId] || {};

    // Callback for the form to report its progress to the central state
    const handleProgressUpdate = useCallback((documentId, percentage) => {
        if (!selectedCandidateId) return;
        updateProgress(selectedCandidateId, documentId, percentage);
    }, [selectedCandidateId, updateProgress]);

    const filteredDocuments = documents.filter(doc => {
        if (doc.name === 'LeavingForm') {
            return isLeaving;
        }
        return true;
    });

    // Effect to fetch candidates when the active event changes
    useEffect(() => {
        const fetchTraineesForEvent = async () => {
            setCandidates([]);
            setSelectedCandidateId('');
            if (!activeEvent || !activeEvent.id) return;

            try {
                const datapack = await window.db.query('SELECT trainee_ids FROM datapack WHERE id = ?', [activeEvent.id]);
                if (!datapack.length || !datapack[0].trainee_ids) return;

                const traineeIds = datapack[0].trainee_ids.split(',').map(Number);
                if (traineeIds.length === 0) return;

                const placeholders = traineeIds.map(() => '?').join(',');
                const query = `SELECT id, forename, surname FROM trainees WHERE id IN (${placeholders})`;
                const traineeDetails = await window.db.query(query, traineeIds);

                const formattedCandidates = traineeDetails.map(t => ({ id: t.id, name: `${t.forename} ${t.surname}` }));
                setCandidates(formattedCandidates);
            } catch (error) {
                console.error('Failed to fetch trainees for event:', error);
            }
        };
        fetchTraineesForEvent();
    }, [activeEvent]);

    useEffect(() => {
        const fetchDocumentsAndProgress = async () => {
            if (!activeEvent || !selectedCandidateId) {
                setDocuments([]);
                return;
            }

            // Always fetch the document list for the active course
            const docIdsResult = await window.db.query('SELECT doc_ids FROM courses WHERE id = ?', [activeEvent.course_id]);
            if (!docIdsResult.length) return;
            const ids = docIdsResult[0].doc_ids.split(',');
            const docs = await window.db.query(
                `SELECT * FROM documents WHERE id IN (${ids.map(() => '?').join(',')}) AND scope = 'candidate' AND visible LIKE ?`,
                [...ids, `%${user.role}%`]
            );
            setDocuments(docs);

            // If progress for this candidate is already in our context state, we don't need to re-calculate it.
            if (progressState[selectedCandidateId]) {
                return;
            }

            // --- Fetch persisted and calculate new progress ---

            // 1. Fetch any progress that was already saved to the database
            const persistedProgress = await window.db.query(
                'SELECT document_id, completion_percentage FROM document_progress WHERE datapack_id = ? AND trainee_id = ?',
                [activeEvent.id, selectedCandidateId]
            );
            const progressMapFromDb = persistedProgress.reduce((acc, row) => {
                acc[row.document_id] = row.completion_percentage;
                return acc;
            }, {});

            // 2. For any documents that had no saved progress, calculate it now
            const docsToCalculate = docs.filter(doc => progressMapFromDb[doc.id] === undefined);
            const calculatedProgressMap = {};

            for (const doc of docsToCalculate) {
                if (['PhoneticQuiz', 'EmergencyPhoneCallExercise', 'Post Course', 'LeavingForm', 'PracticalAssessment', 'RecertEmergencyCallPracticalAssessment'].includes(doc.name)) {
                    calculatedProgressMap[doc.id] = 0; // Default file-based docs to 0
                    continue;
                }

                const questions = await window.db.query('SELECT * FROM questionnaires WHERE document_id = ?', [doc.id]);
                const relevantQuestions = questions.filter(q => {
                     if (q.field_name === 'pre_disabilities_details' || q.field_name === 'pre_learning_difficulties_details') {
                        return false; 
                    }
                    return true;
                });

                if (relevantQuestions.length === 0) {
                    calculatedProgressMap[doc.id] = 100;
                } else {
                    calculatedProgressMap[doc.id] = 0; // Default questionnaire docs to 0 until answered
                }
            }
            
            // 3. Combine DB progress and newly calculated progress, then update the central state
            const finalProgressMap = { ...progressMapFromDb, ...calculatedProgressMap };
            if (Object.keys(finalProgressMap).length > 0) {
                updateBulkProgress(selectedCandidateId, finalProgressMap);
            }
        };

        fetchDocumentsAndProgress();
    }, [activeEvent, selectedCandidateId, user.role, progressState, updateBulkProgress]);

    useEffect(() => {
        if (!isLeaving && selectedDocument?.name === 'Leaving Form') {
            setSelectedDocument(null);
        }
    }, [isLeaving, selectedDocument]);

    // Effect to fetch details when a candidate is selected
    useEffect(() => {
        const fetchCandidateDetails = async () => {
            if (!selectedCandidateId) {
                setSelectedCandidateDetails(null);
                return;
            }
            try {
                const details = await window.db.query('SELECT * FROM trainees WHERE id = ?', [selectedCandidateId]);
                setSelectedCandidateDetails(details.length > 0 ? details[0] : null);
            } catch (error) {
                console.error('Failed to fetch candidate details:', error);
                setSelectedCandidateDetails(null);
            }
        };
        fetchCandidateDetails();
    }, [selectedCandidateId]);

    const handleDocClick = (doc) => {
        setSelectedDocument(doc);
    };

    const renderDocList = (items, selectedItem, handler) => (
        <div className="flex flex-col">
            {items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const progress = docProgress[item.id] || 0;
                return (
                    <button
                        key={item.id}
                        onClick={() => handler(item)}
                        className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none flex justify-between items-center ${
                            isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'
                        }`}
                    >
                        <p className="font-semibold">{formatDocName(item.name)}</p>
                        {progress === 100 && <span className="text-green-500">✅</span>}
                        {progress > 0 && progress < 100 && (
                            <span className="text-sm text-blue-500 font-bold">{progress}%</span>
                        )}
                    </button>
                );
            })}
        </div>
    );

    const renderSelectedForm = () => {
        if (!selectedDocument) {
            return selectedCandidateDetails ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-700">
                        {selectedCandidateDetails.forename} {selectedCandidateDetails.surname}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Sponsor</p>
                            <p className="text-lg font-semibold">{selectedCandidateDetails.sponsor}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Sentry Number</p>
                            <p className="text-lg font-semibold">{selectedCandidateDetails.sentry_number}</p>
                        </div>
                    </div>
                    {selectedCandidateDetails.additional_comments && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium text-gray-500">Additional Comments</p>
                            <p className="text-base whitespace-pre-wrap">{selectedCandidateDetails.additional_comments}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">Select a candidate to view their details.</p>
                </div>
            );
        }

        const props = {
            user: user,
            eventDetails: activeEvent,
            documentDetails: selectedDocument,
            selectedTraineeId: selectedCandidateId,
            onProgressUpdate: handleProgressUpdate,
            openSignatureModal,
        };

        switch (selectedDocument.name) {
            case 'Pre Course':
                return <PreCourseForm {...props} />;
            case 'Post Course':
                return <PostCourseForm {...props} />;
            case 'LeavingForm':
                return <LeavingForm {...props} />;
            case 'PhoneticQuiz':
                return <PhoneticQuizForm {...props} />;
            case 'EmergencyPhoneCallExercise':
                return <EmergencyPhoneCallExerciseForm {...props} />;
            case 'PracticalAssessment':
                return <PracticalAssessmentForm {...props} />;
            case 'RecertEmergencyCallPracticalAssessment':
                return <RecertEmergencyCallPracticalAssessmentForm {...props} />;
            default:
                // Fallback for any other document that might not have a specific form
                return <QuestionnaireForm {...props} />;
        }
    };

    if (!activeEvent || !activeEvent.id) {
        return (
            <div className="flex items-center justify-center h-full p-6 bg-gray-50">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-700">No Event Selected</h3>
                    <p className="text-gray-500">Please go to the "Course" tab and select an event to view candidates.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Panel (15%) - Candidates */}
            <div className="w-[15%] border-r overflow-y-auto bg-white">
                <div className="p-4 font-bold border-b sticky top-0 bg-white z-10">
                    <h2 className="text-lg">Event Candidates</h2>
                </div>
                {candidates.length > 0 ? (
                    <div className="flex flex-col">
                        {candidates.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCandidateId(c.id)}
                                className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none ${selectedCandidateId === c.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="p-4 text-gray-500">No candidates found for this event.</p>
                )}
            </div>

            {/* Middle Panel (15%) - Documents */}
            <div className="w-[15%] border-r overflow-y-auto bg-white">
                <div className="p-4 font-bold border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                    <h2 className="text-lg">Required Docs</h2>
                </div>
                {selectedCandidateId ? (
                    filteredDocuments.length > 0 ? (
                        renderDocList(filteredDocuments, selectedDocument, handleDocClick)
                    ) : (
                        <p className="p-4 text-gray-500">No documents required for this candidate.</p>
                    )
                ) : (
                    <p className="p-4 text-gray-500">Select a candidate first.</p>
                )}
                 <div className="p-4 border-t">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={isLeaving}
                            onChange={(e) => setIsLeaving(e.target.checked)}
                        />
                        <span>Leaving Form</span>
                    </label>
                </div>
            </div>

            {/* Right Panel (70%) - Canvas */}
            <div className="w-[70%] p-6 overflow-y-auto">
                {renderSelectedForm()}
            </div>
        </div>
    );
};

export default CandidateScreen; 