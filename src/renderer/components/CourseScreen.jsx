import React, { useState, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import RegisterPDFGenerator from './pdfgeneration/RegisterPDFGenerator';

const CourseScreen = ({ user }) => {
    const [events, setEvents] = useState([]);
    const { activeEvent, setActiveEvent } = useEvent();

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user || !user.id) return;
            try {
                const query = `
                    SELECT
                        d.id,
                        c.name AS courseName,
                        d.start_date AS startDate
                    FROM
                        datapack d
                    JOIN
                        courses c ON d.course_id = c.id
                    WHERE
                        d.trainer_id = ?
                    ORDER BY
                        d.start_date DESC
                `;
                const results = await window.db.query(query, [user.id]);
                setEvents(results);
            } catch (error) {
                console.error('Failed to fetch events:', error);
            }
        };

        fetchEvents();
    }, [user]);

    const handleEventSelect = (event) => {
        const formattedDate = new Date(event.startDate).toLocaleDateString('en-GB');
        setActiveEvent({
            id: event.id,
            courseName: event.courseName,
            startDate: formattedDate,
        });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <div className="flex h-full bg-gray-50">
            {/* Left Sidebar for Event List */}
            <div className="w-1/3 border-r overflow-y-auto">
                <div className="p-4 font-bold border-b bg-white">Available Events</div>
                <div className="flex flex-col">
                    {events.length > 0 ? (
                        events.map((event) => {
                            const isSelected = activeEvent && activeEvent.id === event.id;
                            return (
                                <button
                                    key={event.id}
                                    onClick={() => handleEventSelect(event)}
                                    className={`p-4 text-left border-b hover:bg-gray-100 focus:outline-none ${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white'}`}
                                >
                                    <p className="font-semibold">{event.courseName}</p>
                                    <p className="text-sm text-gray-600">{formatDate(event.startDate)}</p>
                                </button>
                            );
                        })
                    ) : (
                        <p className="p-4 text-gray-500 bg-white">No events found for you.</p>
                    )}
                </div>
            </div>

            {/* Right Canvas for Event Details */}
            <div className="w-2/3 p-6">
                {activeEvent && activeEvent.id ? (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Current Event: {activeEvent.courseName} — {activeEvent.startDate}
                        </h2>
                        <RegisterPDFGenerator datapackId={activeEvent.id} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select an event from the list to see details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseScreen;
