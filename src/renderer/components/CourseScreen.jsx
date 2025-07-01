import React, { useState, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import RegisterForm from './General/Register/Form';
import TrainingCourseChecklistForm from './General/TrainingCourseChecklist/Form';
import TrainingAndWeldingTrackSafetyBreifingForm from './PTS/TrainingAndWeldingTrackSafetyBreifing/Form';
import ProgressRecordForm from './General/ProgressRecord/Form';

const formatDocName = (name) => {
    if (!name) return '';
    // Add a space before any capital letter that is preceded by a lowercase letter.
    return name.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const CourseScreen = ({ user, openSignatureModal }) => {
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
                SELECT d.id, d.course_id, d.trainer_id, c.name AS courseName, d.start_date, d.duration, d.trainee_ids, c.competency_ids
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
        const fetchDocumentsAndProgress = async () => {
            if (!activeEvent) {
                setDocuments([]);
                setDocProgress({});
                return;
            }

            const course = await window.db.query('SELECT doc_ids FROM courses WHERE id = ?', [activeEvent.course_id]);
            const docIds = course[0]?.doc_ids?.split(',');

            if (docIds && docIds[0] !== '') {
                // Filter documents based on the 'visible' column for the user's role.
                const placeholders = docIds.map(() => '?').join(',');
                const docs = await window.db.query(
                    `SELECT * FROM documents WHERE id IN (${placeholders}) AND scope = 'course' AND visible LIKE ?`,
                    [...docIds, `%${user.role}%`]
                );
                setDocuments(docs);
                
                // Fetch all data needed for calculation up front
                const datapackDetails = await window.db.query('SELECT trainee_ids, duration FROM datapack WHERE id = ?', [activeEvent.id]);
                const traineeIds = datapackDetails[0]?.trainee_ids?.split(',') || [];
                const eventDuration = datapackDetails[0]?.duration || 0;
                const fieldsToExclude = ['trainer_comments', 'trainer_signature', 'admin_comments', 'admin_signature'];

                const progressMap = {};
                for (const doc of docs) {
                    const questions = await window.db.query('SELECT * FROM questionnaires WHERE document_id = ?', [doc.id]);
                    const responsesResult = await window.db.query('SELECT * FROM responses WHERE datapack_id = ? AND document_id = ?', [activeEvent.id, doc.id]);
                    const responses = responsesResult.reduce((acc, res) => {
                        try {
                            const isGrid = res.field_name.includes('_grid');
                            const data = isGrid ? JSON.parse(res.response_data || '{}') : res.response_data;
                            acc[res.field_name] = { ...res, data };
                        } catch {
                            acc[res.field_name] = { ...res, data: {} };
                        }
                        return acc;
                    }, {});

                    const relevantQuestions = questions.filter(q => {
                        if (fieldsToExclude.includes(q.field_name)) {
                            return false;
                        }

                        if (q.section && q.section.startsWith('Day ')) {
                            const dayNumber = parseInt(q.section.split(' ')[1], 10);
                            if (!isNaN(dayNumber) && dayNumber > eventDuration) {
                                return false; 
                            }
                        }
                        
                        if (q.input_type === 'attendance_grid' || q.input_type === 'signature_grid') {
                            const dayNumber = parseInt(q.field_name.split('_')[1], 10);
                            return !isNaN(dayNumber) && dayNumber <= eventDuration;
                        }
                        return true;
                    });
                    
                    if (relevantQuestions.length === 0) {
                        progressMap[doc.id] = 100;
                        continue;
                    }

                    const completedCount = relevantQuestions.filter(q => {
                        const response = responses[q.field_name];
                        if (!response) return false;
                        
                        if (q.input_type.includes('_grid')) {
                            return !!response.completed;
                        }

                        if (q.input_type === 'checkbox') return response.data === 'true';
                        if (q.input_type === 'tri_toggle') return response.data !== 'neutral' && response.data !== '';
                        return response.data && String(response.data).trim() !== '';
                    }).length;

                    progressMap[doc.id] = Math.round((completedCount / relevantQuestions.length) * 100);
                }
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
            openSignatureModal,
        };

        switch (selectedDoc.name) {
            case 'Register':
                return <RegisterForm {...props} />;
            case 'TrainingCourseChecklist':
                return <TrainingCourseChecklistForm {...props} />;
            case 'TrainingAndWeldingTrackSafetyBreifing':
                return <TrainingAndWeldingTrackSafetyBreifingForm {...props} />;
            case 'ProgressRecord':
                return <ProgressRecordForm {...props} />;
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
