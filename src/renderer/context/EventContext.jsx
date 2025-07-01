import React, { createContext, useState, useContext, useCallback } from 'react';

const EventContext = createContext();

export const useEvent = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
    const [activeEvent, setActiveEvent] = useState(null);
    const [progressState, setProgressState] = useState({}); // { [candidateId]: { [docId]: progress } }

    const updateProgress = useCallback(async (candidateId, docId, percentage) => {
        if (!activeEvent || !candidateId) return;

        // 1. Update DB
        try {
            await window.db.run(
                `INSERT OR REPLACE INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) VALUES (?, ?, ?, ?)`,
                [activeEvent.id, docId, candidateId, percentage]
            );
        } catch (error) {
            console.error("Failed to save progress to DB:", error);
        }

        // 2. Update state
        setProgressState(prev => ({
            ...prev,
            [candidateId]: {
                ...(prev[candidateId] || {}),
                [docId]: percentage,
            }
        }));
    }, [activeEvent]);
    
    const updateBulkProgress = useCallback(async (candidateId, progressMap) => {
        if (!activeEvent || !candidateId || Object.keys(progressMap).length === 0) return;

        // 1. Update DB
        try {
            const queries = Object.entries(progressMap).map(([docId, percentage]) => ([
                `INSERT OR REPLACE INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) VALUES (?, ?, ?, ?)`,
                [activeEvent.id, docId, candidateId, percentage]
            ]));
            await window.db.transaction(queries);
        } catch (error) {
            console.error("Failed to bulk save progress to DB:", error);
        }

        // 2. Update state
        setProgressState(prev => ({
            ...prev,
            [candidateId]: {
                ...(prev[candidateId] || {}),
                ...progressMap,
            }
        }));
    }, [activeEvent]);

    // When the event changes, clear the progress state
    const handleSetEvent = (event) => {
        if (event?.id !== activeEvent?.id) {
            setProgressState({});
        }
        setActiveEvent(event);
    };

    const value = {
        activeEvent,
        setActiveEvent: handleSetEvent,
        progressState,
        updateProgress,
        updateBulkProgress,
    };

    return (
        <EventContext.Provider value={value}>
            {children}
        </EventContext.Provider>
    );
}; 