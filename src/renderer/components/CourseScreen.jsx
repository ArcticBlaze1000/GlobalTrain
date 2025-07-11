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
                query += ' WHERE d.trainer_id = ? AND d.status = "live"';
                params.push(user.id);
            } else {
                query += ' WHERE d.status = "live"';
            }

            query += ' ORDER BY d.start_date ASC';

            const [datapacks, trainerDetails] = await Promise.all([
                window.db.query(query, params),
                window.db.query('SELECT id, forename, surname FROM users WHERE role = "trainer"')
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
            const course = await window.db.query('SELECT doc_ids FROM courses WHERE id = ?', [activeEvent.course_id]);
            const docIds = course[0]?.doc_ids?.split(',');

            if (docIds && docIds[0] !== '') {
                // 2. Fetch the actual document details, filtered by scope and user role visibility.
                const placeholders = docIds.map(() => '?').join(',');
                const docs = await window.db.query(
                    `SELECT * FROM documents WHERE id IN (${placeholders}) AND scope = 'course' AND visible LIKE ?`,
                    [...docIds, `%${user.role}%`]
                );
                setDocuments(docs);
                
                // 3. Fetch all progress for this event's documents directly from the `document_progress` table.
                const progressResults = await window.db.query(
                    `SELECT document_id, completion_percentage FROM document_progress WHERE datapack_id = ?`,
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

    const handleEventClick = (event) => {
        setActiveEvent(event);
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

    // Helper to render a list of items (for events)
    const renderEventList = (items, selectedItem, handler) => (
        <div className="flex flex-col">
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handler(item)}
                    className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none ${
                        selectedItem?.id === item.id ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'
                    }`}
                >
                    <p className="font-semibold">{item.courseName}</p>
                    <p className="text-sm text-gray-600">{formatDate(item.start_date)}</p>
                </button>
            ))}
        </div>
    );

    // Helper to render the document list with progress
    const renderDocList = (items, selectedItem, handler) => {
        return (
            <div className="flex flex-col">
                {items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const progress = docProgress[item.id];
                    return (
                        <button
                            key={item.id}
                            onClick={() => handler(item)}
                            className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none flex justify-between items-center ${
                                isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'
                            }`}
                        >
                            <p className="font-semibold">{formatDocName(item.name)}</p>
                            <ProgressIndicator progress={progress} />
                        </button>
                    );
                })}
            </div>
        );
    };

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
                <div className="absolute top-5 right-5 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
                    {notification.message}
                </div>
            )}
            {/* Left Panel (15%) - Events */}
            <div className="w-[15%] border-r bg-white flex flex-col flex-shrink-0">
                <div className="p-4 font-bold border-b sticky top-0 bg-white">Available Events</div>
                <div className="overflow-y-auto">
                    {renderEventList(events, activeEvent, handleEventClick)}
                </div>
            </div>

            {/* Middle Panel (15%) - Documents */}
            <div className="w-[15%] border-r bg-white flex flex-col flex-shrink-0">
                <div className="p-4 font-bold border-b sticky top-0 bg-white">Required Docs</div>
                <div className="overflow-y-auto">
                    {activeEvent ? (
                        documents.length > 0 ? (
                            renderDocList(documents, selectedDoc, handleDocClick)
                        ) : (
                            <p className="p-4 text-gray-500">No documents required.</p>
                        )
                    ) : (
                        <p className="p-4 text-gray-500">Select an event first.</p>
                    )}
                </div>
            </div>

            {/* Right Panel (70%) - Canvas */}
            <div className="w-[70%] p-6 overflow-y-auto">
                {renderSelectedForm()}
            </div>
        </div>
    );
};

export default CourseScreen;
