import React, { createContext, useState, useContext } from 'react';

const EventContext = createContext();

export const useEvent = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
    const [activeEvent, setActiveEvent] = useState(null);
    const [activeDocument, setActiveDocument] = useState(null);
    const [activeTrainee, setActiveTrainee] = useState(null);

    const value = {
        activeEvent,
        setActiveEvent,
        activeDocument,
        setActiveDocument,
        activeTrainee,
        setActiveTrainee,
    };

    return (
        <EventContext.Provider value={value}>
            {children}
        </EventContext.Provider>
    );
}; 