import React, { useState, useEffect, useCallback } from 'react';
import QuestionnaireForm from '../Common/QuestionnaireForm';
import AlertModal from '../Common/AlertModal'; // Import the new modal

const PRE_COURSE_DOC_IDS = [27, 28, 29, 30]; // Booking Form, Joining Instructions, Email Confirmation, Sentinel Pre-Checks, Sub-Sponsor Paperwork

const PreCourseChecklist = ({ register, user, onBackToList, openSignatureModal }) => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [eventDetails, setEventDetails] = useState(null);
    const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '' });

    useEffect(() => {
        const fetchChecklistData = async () => {
            if (!register) return;
            
            // Use the pre-filtered list of applicable doc IDs from the register object
            const applicableDocIds = register.applicableDocIds || [];
            if (applicableDocIds.length === 0) {
                setDocuments([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                const fullEventData = await window.db.query('SELECT * FROM datapack WHERE id = @param1', [register.id]);
                if (fullEventData.length > 0) {
                    const eventData = { ...register, ...fullEventData[0] };
                    if (eventData.trainee_ids) {
                        const traineeIds = eventData.trainee_ids.split(',');
                        if (traineeIds.length > 0) {
                            const fetchedTrainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map((_, i) => `@param${i+1}`).join(',')})`, traineeIds);
                            eventData.trainees = fetchedTrainees;
                        } else {
                            eventData.trainees = [];
                        }
                    } else {
                        eventData.trainees = [];
                    }
                    setEventDetails(eventData);
                }

                const docPlaceholders = applicableDocIds.map((_, i) => `@param${i + 1}`).join(',');
                const docDetails = await window.db.query(
                    `SELECT * FROM documents WHERE id IN (${docPlaceholders}) ORDER BY CHARINDEX(',' + CAST(id AS VARCHAR(MAX)) + ',', ',${applicableDocIds.join(',')},')`,
                    applicableDocIds
                );

                const progressPlaceholders = applicableDocIds.map((_, i) => `@param${i + 2}`).join(',');
                const docProgress = await window.db.query(
                    `SELECT document_id, completion_percentage FROM document_progress WHERE datapack_id = @param1 AND document_id IN (${progressPlaceholders}) AND trainee_id IS NULL`,
                    [register.id, ...applicableDocIds]
                );

                const progressMap = docProgress.reduce((acc, progress) => {
                    acc[progress.document_id] = progress.completion_percentage;
                    return acc;
                }, {});

                const documentsWithProgress = docDetails.map(doc => ({
                    ...doc,
                    progress: progressMap[doc.id] || 0
                }));

                setDocuments(documentsWithProgress);

                if (documentsWithProgress.length > 0 && !selectedDocument) {
                    setSelectedDocument(documentsWithProgress[0]);
                }
            } catch (error) {
                console.error("Failed to fetch checklist data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChecklistData();
    }, [register, selectedDocument]);
    
    useEffect(() => {
        const handleProgressUpdate = (event, { datapackId, documentId, progress }) => {
            if (datapackId === register?.id) {
                setDocuments(prevDocs =>
                    prevDocs.map(doc =>
                        doc.id === documentId ? { ...doc, progress } : doc
                    )
                );
            }
        };

        const unsubscribe = window.electron.onProgressUpdate(handleProgressUpdate);

        // Cleanup the listener when the component unmounts
        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [register]);

    const handleSaveSuccess = useCallback(() => {
        const fetchProgress = async () => {
            if (!register) return;
    
            const applicableDocIds = register.applicableDocIds || [];
            if (applicableDocIds.length === 0) return;

            const progressPlaceholders = applicableDocIds.map((_, i) => `@param${i + 2}`).join(',');
            const docProgress = await window.db.query(
                `SELECT document_id, completion_percentage FROM document_progress WHERE datapack_id = @param1 AND document_id IN (${progressPlaceholders})`,
                [register.id, ...applicableDocIds]
            );
    
            const progressMap = docProgress.reduce((acc, progress) => {
                acc[progress.document_id] = progress.completion_percentage;
                return acc;
            }, {});
    
            setDocuments(prevDocs => prevDocs.map(doc => ({
                ...doc,
                progress: progressMap[doc.id] || 0
            })));
        };
    
        fetchProgress();
    }, [register]);
    
    const formatDocName = (name) => name.replace(/([a-z])([A-Z])/g, '$1 $2');

    const allDocumentsCompleted = documents.length > 0 && documents.every(doc => doc.progress === 100);

    const handleSubmitChecklist = async () => {
        if (!register || !allDocumentsCompleted) return;
        try {
            await window.db.run(
                "UPDATE datapack SET status = 'live' WHERE id = @param1",
                [register.id]
            );
            setAlertInfo({
                show: true,
                title: 'Success!',
                message: 'Pre-course checklist submitted successfully! The event is now live.'
            });
        } catch (error) {
            console.error('Failed to update datapack status:', error);
            setAlertInfo({
                show: true,
                title: 'Error',
                message: 'Failed to submit the checklist. Please try again.'
            });
        }
    };

    const handleRevertStatus = async () => {
        if (!register) return;
        try {
            await window.db.run(
                "UPDATE datapack SET status = 'incomplete' WHERE id = @param1",
                [register.id]
            );
            setAlertInfo({
                show: true,
                title: 'Status Updated',
                message: 'The event status has been reverted to incomplete.'
            });
        } catch (error) {
            console.error('Failed to update datapack status:', error);
            setAlertInfo({
                show: true,
                title: 'Error',
                message: 'Failed to revert the status. Please try again.'
            });
        }
    };

    const handleCloseAlert = () => {
        setAlertInfo({ show: false, title: '', message: '' });
        if (alertInfo.title === 'Success!' || alertInfo.title === 'Status Updated') {
            onBackToList(); // Go back to the list view on success or status update
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading Pre-Course Checklist...</div>;
    }

    return (
        <>
            <AlertModal
                show={alertInfo.show}
                title={alertInfo.title}
                message={alertInfo.message}
                onClose={handleCloseAlert}
            />
            <div className="flex flex-col h-full bg-gray-50">
                <div className="p-4 border-b bg-white">
                    <button onClick={onBackToList} className="text-blue-600 hover:underline mb-2">
                        &larr; Back to Registers
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Pre-Course Checklist for {register.courseName}</h1>
                </div>
                <div className="flex flex-grow overflow-hidden">
                    {/* Left Sidebar Panel */}
                    <div className="w-1/4 bg-gray-100 p-4 border-r overflow-y-auto flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-gray-700">Documents</h2>
                            <ul>
                                {documents.map(doc => (
                                    <li key={doc.id}
                                        onClick={() => setSelectedDocument(doc)}
                                        className={`p-3 rounded-md cursor-pointer mb-2 transition-colors duration-200 ${selectedDocument?.id === doc.id ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-800'}`}>
                                        <div className="flex justify-between items-center">
                                            <span>{formatDocName(doc.name)}</span>
                                            {doc.progress === 100 ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            ) : (
                                                <span className={`text-sm font-semibold ${selectedDocument?.id === doc.id ? 'text-white' : 'text-gray-600'}`}>
                                                    {doc.progress || 0}%
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <button
                                disabled={!allDocumentsCompleted}
                                onClick={handleSubmitChecklist}
                                className={`w-full py-2.5 px-4 mt-4 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out ${
                                    allDocumentsCompleted
                                        ? 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                                        : 'bg-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {allDocumentsCompleted ? 'Submit Pre-Course Checklist' : 'Checklist Incomplete'}
                            </button>
                            <button
                                onClick={handleRevertStatus}
                                className="w-full py-2.5 px-4 mt-2 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 ease-in-out"
                            >
                                Revert to Incomplete
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <main className="w-3/4 p-6 overflow-y-auto">
                        {selectedDocument && eventDetails && user ? (
                            <QuestionnaireForm
                                key={`${selectedDocument.id}-${eventDetails.id}`} // Force re-mount on document or event change
                                user={user}
                                eventDetails={eventDetails}
                                documentDetails={selectedDocument}
                                openSignatureModal={openSignatureModal}
                                showPdfButton={false}
                                valueColumnHeader='Status'
                                hideCompletedColumn={true}
                                onSaveSuccess={handleSaveSuccess}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Select a document from the left to begin.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default PreCourseChecklist; 