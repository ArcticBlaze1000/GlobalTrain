import React, { createContext, useState, useContext } from 'react';

const EventContext = createContext();

export const useEvent = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
    const [activeEvent, setActiveEvent] = useState(null);

    const value = {
        activeEvent,
        setActiveEvent,
    };

    return (
        <EventContext.Provider value={value}>
            {children}
        </EventContext.Provider>
    );
}; 