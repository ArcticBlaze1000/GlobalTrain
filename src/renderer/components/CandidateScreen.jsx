import React, { useState, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import Dropdown from './common/Dropdown';
import QuestionnaireForm from './common/QuestionnaireForm';
import PreCourseForm from './General/PreCourse/Form';
import PostCourseForm from './General/PostCourse/Form';
import LeavingForm from './General/LeavingForm/Form';
import PhoneticQuizForm from './PTS/PhoneticQuiz/Form';
import EmergencyPhoneCallExerciseForm from './PTS/EmergencyPhoneCallExercise/Form';

const formatDocName = (name) => {
    if (!name) return '';
    // Add a space before any capital letter that is preceded by a lowercase letter.
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const CandidateScreen = ({ user, openSignatureModal }) => {
    // Shared state from context
    const { activeEvent } = useEvent();

    // State for data
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
    const [documents, setDocuments] = useState([]);

    // State for form controls
    const [selectedCandidateId, setSelectedCandidateId] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Callback for the form to report its progress
    const handleProgressUpdate = useCallback((documentId, percentage) => {
        // Placeholder for progress update logic
        console.log(`Progress for doc ${documentId}: ${percentage}%`);
    }, []);

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
        const fetchDocuments = async () => {
            if (activeEvent) {
                const docIds = await window.db.query(
                    'SELECT doc_ids FROM courses WHERE id = ?',
                    [activeEvent.course_id]
                );
                
                if (docIds.length > 0) {
                    const ids = docIds[0].doc_ids.split(',');
                    const docs = await window.db.query(
                        `SELECT * FROM documents WHERE id IN (${ids.map(() => '?').join(',')}) AND scope = 'candidate'`,
                        [...ids]
                    );
                    setDocuments(docs);
                }
            }
        };
        fetchDocuments();
    }, [activeEvent]);

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
                return (
                    <button
                        key={item.id}
                        onClick={() => handler(item)}
                        className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none flex justify-between items-center ${
                            isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'
                        }`}
                    >
                        <p className="font-semibold">{formatDocName(item.name)}</p>
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
            default:
                // Fallback for any other document that might not have a specific form
                return <QuestionnaireForm {...props} />;
        }
    };

    // Render a placeholder if no event is selected
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
        <div className="flex h-full bg-gray-50">
            {/* Left Column for Controls */}
            <div className="w-[15%] bg-white p-6 border-r">
                <h2 className="text-xl font-bold mb-6">Candidate Selections</h2>
                <div className="space-y-6">
                    <Dropdown
                        label="Candidate"
                        value={selectedCandidateId}
                        onChange={setSelectedCandidateId}
                        options={candidates}
                        placeholder="Select Candidate"
                    />
                    <Dropdown
                        label="Folders"
                        value={selectedFolder}
                        onChange={setSelectedFolder}
                        options={[]}
                        placeholder="Select Folder"
                    />
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="leaving-checkbox"
                            checked={isLeaving}
                            onChange={e => setIsLeaving(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="leaving-checkbox" className="ml-2 block text-sm font-medium text-gray-700">
                            Leaving
                        </label>
                    </div>
                </div>
            </div>

            {/* Middle Column for Documents */}
            <div className="w-[15%] bg-white p-6 border-r">
                <h2 className="text-xl font-bold mb-6">Required Docs</h2>
                {selectedCandidateId ? (
                    filteredDocuments.length > 0 ? (
                        renderDocList(filteredDocuments, selectedDocument, handleDocClick)
                    ) : (
                        <p className="p-4 text-gray-500">No documents required for this candidate.</p>
                    )
                ) : (
                    <p className="p-4 text-gray-500">Select a candidate to see documents.</p>
                )}
            </div>

            {/* Right Column for Display */}
            <div className="w-[70%] p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Event: {activeEvent.courseName} — {activeEvent.startDate}
                </h2>

                {selectedDocument ? (
                    renderSelectedForm()
                ) : selectedCandidateDetails ? (
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
                )}
            </div>
        </div>
    );
};

export default CandidateScreen; 