import React, { useState, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import RegisterForm from './Register/Form';
import TrainingCourseChecklistForm from './TrainingCourseChecklist/Form';
import TrainingAndWeldingTrackSafetyBreifingForm from './TrainingAndWeldingTrackSafetyBreifing/Form';

const CourseScreen = ({ user }) => {
    const [events, setEvents] = useState([]);
    const { activeEvent, setActiveEvent } = useEvent();
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docProgress, setDocProgress] = useState({}); // Tracks completion percentage for each doc

    // Callback for the form to report its progress
    const handleProgressUpdate = useCallback((documentId, percentage) => {
        setDocProgress(prev => ({ ...prev, [documentId]: percentage }));
    }, []);

    // Fetch events based on user role
    useEffect(() => {
        const fetchEvents = async () => {
            if (!user?.id) return;

            let query = `
                SELECT d.id, d.course_id, c.name AS courseName, d.start_date, d.duration, d.trainee_ids, c.competency_ids
                FROM datapack d
                JOIN courses c ON d.course_id = c.id
            `;
            const params = [];

            // If user is a trainer, only fetch their events. Admins/devs see all.
            if (user.role === 'trainer') {
                query += ' WHERE d.trainer_id = ?';
                params.push(user.id);
            }

            query += ' ORDER BY d.start_date ASC';

            const datapacks = await window.db.query(query, params);
            setEvents(datapacks);
        };
        fetchEvents();
    }, [user]);

    // When an event is selected, fetch its associated documents
    useEffect(() => {
        const fetchDocuments = async () => {
            if (!activeEvent) {
                setDocuments([]);
                return;
            }
            const course = await window.db.query('SELECT doc_ids FROM courses WHERE id = ?', [activeEvent.course_id]);
            const docIds = course[0]?.doc_ids?.split(',');

            if (docIds && docIds[0] !== '') {
                const placeholders = docIds.map(() => '?').join(',');
                const docs = await window.db.query(`SELECT * FROM documents WHERE id IN (${placeholders})`, docIds);
                setDocuments(docs);
            } else {
                setDocuments([]);
            }
        };
        fetchDocuments();
        setSelectedDoc(null); // Reset doc selection when event changes
        setDocProgress({}); // Reset progress on event change
    }, [activeEvent]);

    const handleEventClick = (event) => {
        setActiveEvent(event);
    };

    const handleDocClick = (doc) => {
        setSelectedDoc(doc);
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
                        <p className="font-semibold">{item.name}</p>
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
            onProgressUpdate: handleProgressUpdate,
        };

        switch (selectedDoc.name) {
            case 'Register':
                return <RegisterForm {...props} />;
            case 'TrainingCourseChecklist':
                return <TrainingCourseChecklistForm {...props} />;
            case 'TrainingAndWeldingTrackSafetyBreifing':
                return <TrainingAndWeldingTrackSafetyBreifingForm {...props} />;
            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No form available for this document.</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Panel (15%) - Events */}
            <div className="w-[15%] border-r overflow-y-auto">
                <div className="p-4 font-bold border-b bg-white sticky top-0">Available Events</div>
                {renderEventList(events, activeEvent, handleEventClick)}
            </div>

            {/* Middle Panel (15%) - Documents */}
            <div className="w-[15%] border-r overflow-y-auto">
                <div className="p-4 font-bold border-b bg-white sticky top-0">Required Docs</div>
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

            {/* Right Panel (70%) - Canvas */}
            <div className="w-[70%] p-6 overflow-y-auto">
                {renderSelectedForm()}
            </div>
        </div>
    );
};

export default CourseScreen;
