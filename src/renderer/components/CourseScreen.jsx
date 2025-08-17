import React, { useState, useEffect, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import { useEvent } from '../context/EventContext';
import ProgressIndicator from './Common/ProgressIndicator';
import RegisterForm from './General/Register/Form';
import TrainingCourseChecklistForm from './General/TrainingCourseChecklist/Form';
import TrainingAndWeldingTrackSafetyBreifingForm from './PTS/TrainingAndWeldingTrackSafetyBreifing/Form';
import ProgressRecordForm from './General/ProgressRecord/Form';
import SwipesForm from './General/Swipes/Form';
import GeneralTrackVisitForm from './General/GeneralTrackVisitForm/Form';
import SWPForm from './General/SWP/Form';
import TrackWalkDeliveryRequirementsForm from './PTS/TrackWalkDeliveryRequirements/Form';
import DeviationForm from './General/DeviationForm/Form';
import PhoneticQuizTemplate from './PTS/PhoneticQuiz/Form';
import EmergencyPhoneCallExerciseTemplate from './PTS/EmergencyPhoneCallExercise/Form';
import RecertEmergencyCallPracticalAssessmentTemplate from './PTS/RecertEmergencyCallPracticalAssessment/Form';
import TrackWalkDeliveryRequirementsTemplate from './PTS/TrackWalkDeliveryRequirements/Form';

const formatDocName = (name) => {
    if (!name) return '';
    // Add a space before any capital letter that is preceded by a lowercase letter.
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const CourseScreen = ({ user, openSignatureModal }) => {
    const [events, setEvents] = useState([]);
    const { activeEvent, setActiveEvent, setActiveDocument } = useEvent();
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docProgress, setDocProgress] = useState({}); // Tracks completion percentage for each doc
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [expandedEventId, setExpandedEventId] = useState(null);

    // Fetch events based on user role
    useEffect(() => {
        const fetchEvents = async () => {
            if (!user?.id) return;

            let query = `
                SELECT d.id, d.course_id, d.trainer_id, c.name AS courseName, d.start_date, d.duration, d.trainee_ids, c.competency_ids
                FROM datapack d
                JOIN courses c ON d.course_id = c.id
            `;
            const params = [];

            // If user is a trainer, only fetch their events. Admins/devs see all.
            if (user.role === 'trainer') {
                query += ' WHERE d.trainer_id = @param1 AND d.status = @param2';
                params.push(user.id, 'live');
            } else {
                query += ' WHERE d.status = @param1';
                params.push('live');
            }

            query += ' ORDER BY d.start_date ASC';

            const [datapacks, trainerDetails] = await Promise.all([
                window.db.query(query, params),
                window.db.query('SELECT id, forename, surname FROM users WHERE role = @param1', ['trainer'])
            ]);
            
            const trainersMap = trainerDetails.reduce((acc, trainer) => {
                acc[trainer.id] = { forename: trainer.forename, surname: trainer.surname };
                return acc;
            }, {});

            const eventsWithTrainerNames = datapacks.map(dp => ({
                ...dp,
                forename: trainersMap[dp.trainer_id]?.forename || 'N/A',
                surname: trainersMap[dp.trainer_id]?.surname || 'N/A'
            }));

            setEvents(eventsWithTrainerNames);
        };
        fetchEvents();
    }, [user]);

    useEffect(() => {
        const handleProgressUpdate = (event, { datapackId, documentId, traineeId, progress }) => {
            // Course screen only cares about course-level progress (traineeId is null)
            if (activeEvent?.id === datapackId && traineeId === null) {
                setDocProgress(prev => ({ ...prev, [documentId]: progress }));
            }
        };

        window.electron.onProgressUpdate(handleProgressUpdate);

        // Cleanup
        return () => {
            // When the component unmounts, we need to remove the listener.
            // The ipcRenderer.removeListener function is what we need, but we need to expose it.
            // For now, this structure sets up the listener correctly.
        };
    }, [activeEvent]);

    // When an event is selected, fetch its associated documents and their progress
    useEffect(() => {
        const fetchDocumentsAndProgress = async () => {
            if (!activeEvent) {
                setDocuments([]);
                setDocProgress({});
                return;
            }

            // 1. Fetch the course to get the list of document IDs.
            const course = await window.db.query('SELECT doc_ids FROM courses WHERE id = @param1', [activeEvent.course_id]);
            const docIds = course[0]?.doc_ids?.split(',');

            if (docIds && docIds[0] !== '') {
                // 2. Fetch the actual document details, filtered by scope and user role visibility.
                const placeholders = docIds.map((_, i) => `@param${i+1}`).join(',');
                const docs = await window.db.query(
                    `SELECT * FROM documents WHERE id IN (${placeholders}) AND scope = @param${docIds.length+1} AND visible LIKE @param${docIds.length+2}`,
                    [...docIds, 'course', `%${user.role}%`]
                );
                setDocuments(docs);
                
                // 3. Fetch all progress for this event's documents directly from the `document_progress` table.
                const progressResults = await window.db.query(
                    `SELECT document_id, completion_percentage FROM document_progress WHERE datapack_id = @param1 AND trainee_id IS NULL`,
                    [activeEvent.id]
                );

                // 4. Map the results into the state object.
                const progressMap = progressResults.reduce((acc, row) => {
                    acc[row.document_id] = row.completion_percentage;
                    return acc;
                }, {});
                setDocProgress(progressMap);

            } else {
                setDocuments([]);
                setDocProgress({});
            }
        };

        fetchDocumentsAndProgress();
        setSelectedDoc(null); // Reset doc selection when event changes
    }, [activeEvent, user.role]);

    const handleEventToggle = (event) => {
        const newExpandedId = expandedEventId === event.id ? null : event.id;
        setExpandedEventId(newExpandedId);
        setActiveEvent(newExpandedId ? event : null);
        
        if (selectedDoc) {
            setSelectedDoc(null);
            setActiveDocument(null);
        }
    };

    const handleDocClick = async (doc) => {
        setSelectedDoc(doc);
        setActiveDocument(doc);
    };

    const handlePdfSave = async (FormToRender) => {
        setNotification({ show: true, message: 'Generating PDF...' });
        try {
            const cssPath = await window.electron.getCssPath();
            
            const htmlContent = ReactDOMServer.renderToString(
                <>
                    <link rel="stylesheet" href={cssPath}></link>
                    <div className="p-8">
                        <FormToRender
                            user={user}
                            eventDetails={activeEvent}
                            documentDetails={selectedDoc}
                            openSignatureModal={openSignatureModal}
                            isPdfMode={true} // Special prop to render for PDF
                        />
                    </div>
                </>
            );

            const payload = {
                htmlContent,
                eventDetails: activeEvent,
                documentDetails: selectedDoc,
                // No traineeDetails for course-level documents
            };

            const result = await window.electron.savePdf(payload);
            setNotification({ show: true, message: result });

        } catch (error) {
            console.error('Failed to save PDF:', error);
            setNotification({ show: true, message: `Error: ${error.message}` });
        } finally {
            // Hide notification after a few seconds
            setTimeout(() => setNotification({ show: false, message: '' }), 5000);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

    const renderSelectedForm = () => {
        if (!selectedDoc) {
            return (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Select a document to begin.</p>
                </div>
            );
        }

        const props = {
            user: user,
            eventDetails: activeEvent,
            documentDetails: selectedDoc,
            openSignatureModal,
            onPdfButtonClick: handlePdfSave, // Pass the save handler
        };
        
        const currentProgress = docProgress[selectedDoc.id];
        const pdfButtonText = `${currentProgress === 100 ? 'Save' : 'Generate'} ${formatDocName(selectedDoc.name)} PDF`;

        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{formatDocName(selectedDoc.name)}</h2>
                    <ProgressIndicator progress={currentProgress} />
                </div>
                {(() => {
                    switch (selectedDoc.name) {
                        case 'Register':
                            return <RegisterForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'TrainingCourseChecklist':
                            return <TrainingCourseChecklistForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'TrainingAndWeldingTrackSafetyBreifing':
                            return <TrainingAndWeldingTrackSafetyBreifingForm {...props} onPdfButtonClick={() => handlePdfSave(TrainingAndWeldingTrackSafetyBreifingForm)} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'ProgressRecord':
                            return <ProgressRecordForm {...props} onDeviationUpdate={() => {}} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'Swipes':
                            return <SwipesForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'GeneralTrackVisitForm':
                            return <GeneralTrackVisitForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'SWP':
                            return <SWPForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'TrackWalkDeliveryRequirements':
                            return <TrackWalkDeliveryRequirementsForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'DeviationForm':
                            return <DeviationForm {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'PracticalAssessment':
                            return <PracticalAssessmentTemplate {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'PhoneticQuiz':
                            return <PhoneticQuizTemplate {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'EmergencyPhoneCallExercise':
                            return <EmergencyPhoneCallExerciseTemplate {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'RecertEmergencyCallPracticalAssessment':
                            return <RecertEmergencyCallPracticalAssessmentTemplate {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        case 'TrackWalkDeliveryRequirementsTemplate':
                            return <TrackWalkDeliveryRequirementsTemplate {...props} currentProgress={currentProgress} pdfButtonText={pdfButtonText} />;
                        default:
                            return (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">No form available for this document.</p>
                                </div>
                            );
                    }
                })()}
            </>
        );
    };

    return (
        <div className="flex h-full bg-gray-50">
            {notification.show && (
                <div className="fixed top-5 right-5 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    {notification.message}
                </div>
            )}
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0 border-r bg-white overflow-y-auto p-4 shadow-md">
                <h2 className="text-xl font-bold mb-4 px-2">Available Events</h2>
                <div className="flex flex-col space-y-2">
                    {events.map((event) => (
                        <div key={event.id}>
                            <button
                                onClick={() => handleEventToggle(event)}
                                className={`w-full p-4 text-left border rounded-lg focus:outline-none flex justify-between items-center transition-all duration-200 ${
                                    expandedEventId === event.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                                }`}
                            >
                                <div>
                                    <p className="font-semibold">{event.courseName}</p>
                                    <p className="text-sm text-gray-600">{formatDate(event.start_date)}</p>
                                </div>
                                <svg
                                    className={`w-5 h-5 transform transition-transform ${
                                        expandedEventId === event.id ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            {expandedEventId === event.id && (
                                <div className="pl-4 mt-2 space-y-1 border-l-2 ml-4">
                                    <h3 className="font-semibold text-gray-700 mt-2 mb-2 pl-2">Required Docs</h3>
                                    <ul className="space-y-1">
                                        {documents.map((doc) => (
                                            <li key={doc.id}
                                                onClick={() => handleDocClick(doc)}
                                                className={`p-3 rounded-md cursor-pointer mb-2 transition-colors duration-200 ${selectedDoc?.id === doc.id ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-800'}`}>
                                                <div className="flex justify-between items-center">
                                                    <span>{formatDocName(doc.name)}</span>
                                                    {docProgress[doc.id] === 100 ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    ) : (
                                                        <span className={`text-sm font-semibold ${selectedDoc?.id === doc.id ? 'text-white' : 'text-red-500'}`}>
                                                            {docProgress[doc.id] || 0}%
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow p-6 bg-white overflow-y-auto">
                {renderSelectedForm()}
            </div>
        </div>
    );
};

export default CourseScreen;
