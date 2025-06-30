import React, { useState, useEffect } from 'react';
import CreationScreen from './CreationScreen';
import CourseScreen from './CourseScreen';
import CandidateScreen from './CandidateScreen';
import UsersScreen from './UsersScreen';
import DeveloperTools from './common/DeveloperTools';
import SignatureModal from './common/SignatureModal';
import { useEvent } from '../context/EventContext';

// A local component for rendering tab buttons to reduce repetition
const TabButton = ({ name, activeTab, setActiveTab }) => {
    const isActive = activeTab === name.toLowerCase();
    return (
        <button
            className={`py-2 px-6 text-sm font-medium ${isActive ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab(name.toLowerCase())}
        >
            {name}
        </button>
    );
};

const Dashboard = ({ user, onLogout }) => {
    const { setActiveEvent } = useEvent();

    // Effect for candidate role to auto-load their data
    useEffect(() => {
        if (user.role === 'candidate') {
            const fetchAndSetCandidateEvent = async () => {
                try {
                    // Find the trainee record for the logged-in user
                    const traineeResult = await window.db.query(
                        'SELECT * FROM trainees WHERE forename = ? AND surname = ? LIMIT 1',
                        [user.forename, user.surname]
                    );
    
                    if (traineeResult.length > 0) {
                        const trainee = traineeResult[0];
    
                        // Find the full event details for this trainee
                        const eventResult = await window.db.query(
                            `SELECT d.id, d.course_id, c.name AS courseName, d.start_date, d.duration, d.trainee_ids, c.competency_ids
                             FROM datapack d
                             JOIN courses c ON d.course_id = c.id
                             WHERE d.id = ?`,
                            [trainee.datapack]
                        );
    
                        // Set the active event in the global context
                        if (eventResult.length > 0) {
                            setActiveEvent(eventResult[0]);
                        }
                    }
                } catch (error) {
                    console.error('Failed to auto-fetch event for candidate:', error);
                }
            };
    
            fetchAndSetCandidateEvent();
        }
    }, [user, setActiveEvent]);

    // Set default tab based on role
    const getDefaultTab = () => {
        if (user.role === 'candidate') return 'candidate';
        if (user.role === 'dev' || user.role === 'admin') return 'creation';
        return 'course';
    };
    const [activeTab, setActiveTab] = useState(getDefaultTab());
    const [signatureState, setSignatureState] = useState({ isOpen: false, onSave: null, initialData: null });

    const openSignatureModal = (onSave, initialData = null) => {
        setSignatureState({
            isOpen: true,
            onSave: (dataUrl) => {
                onSave(dataUrl);
                closeSignatureModal();
            },
            initialData: initialData
        });
    };

    const closeSignatureModal = () => {
        setSignatureState({ isOpen: false, onSave: null, initialData: null });
    };

    const renderHeader = () => (
        <div className="relative z-10 flex justify-between items-center border-b bg-white shadow-sm p-2">
            {/* Tabs on the left */}
            <div className="flex">
                {user.role === 'candidate' ? (
                    <TabButton name="Candidate" activeTab={activeTab} setActiveTab={setActiveTab} />
                ) : (
                    <>
                        {(user.role === 'dev' || user.role === 'admin') && (
                            <TabButton name="Creation" activeTab={activeTab} setActiveTab={setActiveTab} />
                        )}
                        <TabButton name="Course" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton name="Candidate" activeTab={activeTab} setActiveTab={setActiveTab} />
                        {(user.role === 'dev' || user.role === 'admin') && (
                            <TabButton name="Users" activeTab={activeTab} setActiveTab={setActiveTab} />
                        )}
                    </>
                )}
            </div>

            {/* User info and Logout button on the right */}
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                    Welcome, {user.forename} ({user.role})
                </span>
                <button
                    onClick={onLogout}
                    className="py-1 px-3 text-sm text-red-500 border border-red-500 rounded-md hover:bg-red-500 hover:text-white"
                >
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen">
            {renderHeader()}
            <div className="flex-grow overflow-y-auto">
                {(user.role === 'dev' || user.role === 'admin') && activeTab === 'users' && <UsersScreen currentUser={user} />}
                {(user.role === 'dev' || user.role === 'admin') && activeTab === 'creation' && <CreationScreen />}
                {user.role !== 'candidate' && activeTab === 'course' && <CourseScreen user={user} openSignatureModal={openSignatureModal} />}
                {activeTab === 'candidate' && <CandidateScreen user={user} openSignatureModal={openSignatureModal} />}
            </div>
            {user.role === 'dev' && <DeveloperTools />}
            <SignatureModal 
                show={signatureState.isOpen}
                onClose={closeSignatureModal}
                onSave={signatureState.onSave}
                signatureData={signatureState.initialData}
            />
        </div>
    );
};

export default Dashboard;