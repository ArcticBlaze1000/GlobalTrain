import React, { useState, useEffect } from 'react';
import QuestionnaireForm from '../Common/QuestionnaireForm';

const PRE_COURSE_DOC_IDS = [27, 28, 29, 33, 30]; // Booking Form, Joining Instructions, Email Confirmation, Sentinel Pre-Checks, Sub-Sponsor Paperwork

const PreCourseChecklist = ({ register, user, onBackToList, openSignatureModal }) => {
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [eventDetails, setEventDetails] = useState(null);

    useEffect(() => {
        const fetchChecklistData = async () => {
            if (!register) return;
            setIsLoading(true);

            try {
                // Fetch full event details including trainees, as QuestionnaireForm needs it.
                const fullEventData = await window.db.query('SELECT * FROM datapack WHERE id = ?', [register.id]);
                if (fullEventData.length > 0) {
                    const eventData = { ...register, ...fullEventData[0] };
                    if (eventData.trainee_ids) {
                        const traineeIds = eventData.trainee_ids.split(',');
                        if (traineeIds.length > 0) {
                            const fetchedTrainees = await window.db.query(`SELECT * FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);
                            eventData.trainees = fetchedTrainees;
                        } else {
                            eventData.trainees = [];
                        }
                    } else {
                        eventData.trainees = [];
                    }
                    setEventDetails(eventData);
                }

                // Fetch the document details for the sidebar
                const docPlaceholders = PRE_COURSE_DOC_IDS.map(() => '?').join(',');
                const docDetails = await window.db.query(
                    `SELECT * FROM documents WHERE id IN (${docPlaceholders}) ORDER BY INSTR(',${PRE_COURSE_DOC_IDS.join(',')},', ',' || id || ',')`,
                    PRE_COURSE_DOC_IDS
                );
                setDocuments(docDetails);
                
                // Select the first document by default
                if (docDetails.length > 0) {
                    setSelectedDocument(docDetails[0]);
                }
            } catch (error) {
                console.error("Failed to fetch checklist data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchChecklistData();
    }, [register]);
    
    const formatDocName = (name) => name.replace(/([a-z])([A-Z])/g, '$1 $2');

    if (isLoading) {
        return <div className="p-6 text-center">Loading Pre-Course Checklist...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 border-b bg-white">
                <button onClick={onBackToList} className="text-blue-600 hover:underline mb-2">
                    &larr; Back to Registers
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Pre-Course Checklist for {register.courseName}</h1>
            </div>
            <div className="flex flex-grow overflow-hidden">
                {/* Left Sidebar Panel */}
                <div className="w-1/4 bg-gray-100 p-4 border-r overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Documents</h2>
                    <ul>
                        {documents.map(doc => (
                            <li key={doc.id}
                                onClick={() => setSelectedDocument(doc)}
                                className={`p-3 rounded-md cursor-pointer mb-2 transition-colors duration-200 ${selectedDocument?.id === doc.id ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-800'}`}>
                                {formatDocName(doc.name)}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Main Content Area */}
                <main className="w-3/4 p-6 overflow-y-auto">
                    {selectedDocument && eventDetails && user ? (
                        <QuestionnaireForm
                            user={user}
                            eventDetails={eventDetails}
                            documentDetails={selectedDocument}
                            openSignatureModal={openSignatureModal}
                            showPdfButton={false}
                            valueColumnHeader='Status'
                            hideCompletedColumn={true}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">Select a document from the left to begin.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PreCourseChecklist; 