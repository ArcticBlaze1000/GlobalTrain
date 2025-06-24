import React, { useState, useEffect } from 'react';

const CourseScreen = ({ user }) => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);

    // Fetch all events for the current user (trainer)
    useEffect(() => {
        const fetchEvents = async () => {
            if (!user?.id) return;
            const datapacks = await window.db.query(
                `SELECT d.id, d.course_id, c.name AS courseName, d.start_date
                 FROM datapack d
                 JOIN courses c ON d.course_id = c.id
                 WHERE d.trainer_id = ?
                 ORDER BY d.start_date DESC`,
                [user.id]
            );
            setEvents(datapacks);
        };
        fetchEvents();
    }, [user]);

    // When an event is selected, fetch its associated documents
    useEffect(() => {
        const fetchDocuments = async () => {
            if (!selectedEvent) {
                setDocuments([]);
                return;
            }
            // The course table holds the doc_ids
            const course = await window.db.query('SELECT doc_ids FROM courses WHERE id = ?', [selectedEvent.course_id]);
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
    }, [selectedEvent]);

    const handleEventClick = (event) => {
        setSelectedEvent(event);
    };

    const handleDocClick = (doc) => {
        setSelectedDoc(doc);
    };
    
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

    // Helper to render a list of items (for events and docs)
    const renderList = (items, selectedItem, handler, titleKey, subtitleKey) => (
        <div className="flex flex-col">
            {items.length > 0 ? (
                items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handler(item)}
                            className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none ${
                                isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'
                            }`}
                        >
                            <p className="font-semibold">{item[titleKey]}</p>
                            {subtitleKey && <p className="text-sm text-gray-600">{formatDate(item[subtitleKey])}</p>}
                        </button>
                    );
                })
            ) : (
                <p className="p-4 text-gray-500">No items found.</p>
            )}
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Panel (15%) - Events */}
            <div className="w-[15%] border-r overflow-y-auto">
                <div className="p-4 font-bold border-b bg-white sticky top-0">Available Events</div>
                {renderList(events, selectedEvent, handleEventClick, 'courseName', 'start_date')}
            </div>

            {/* Middle Panel (15%) - Documents */}
            <div className="w-[15%] border-r overflow-y-auto">
                <div className="p-4 font-bold border-b bg-white sticky top-0">Required Docs</div>
                {selectedEvent ? (
                    renderList(documents, selectedDoc, handleDocClick, 'name')
                ) : (
                    <p className="p-4 text-gray-500">Select an event first.</p>
                )}
            </div>

            {/* Right Panel (70%) - Canvas */}
            <div className="w-[70%] p-6">
                {selectedDoc ? (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">{selectedDoc.name}</h2>
                        <p>Form UI will render here.</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select a document to begin.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseScreen;
