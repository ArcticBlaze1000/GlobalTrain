import React, { useState } from 'react';
import CreationScreen from './CreationScreen';
import CourseScreen from './CourseScreen';
import CandidateScreen from './CandidateScreen';
import UsersScreen from './UsersScreen';
import DeveloperTools from './common/DeveloperTools';
import SignatureModal from './common/SignatureModal';

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
    // Set default tab based on role
    const getDefaultTab = () => {
        if (user.role === 'dev' || user.role === 'admin') return 'creation';
        return 'course';
    };
    const [activeTab, setActiveTab] = useState(getDefaultTab());
    const [signatureModal, setSignatureModal] = useState({ isOpen: false, onSave: null, currentSignature: '' });

    const openSignatureModal = (onSave, currentSignature = '') => {
        setSignatureModal({
            isOpen: true,
            onSave: (dataUrl) => {
                // The onSave from the child component will be wrapped
                // to also close the modal from here.
                onSave(dataUrl);
                closeSignatureModal();
            },
            currentSignature
        });
    };

    const closeSignatureModal = () => {
        setSignatureModal({ isOpen: false, onSave: null, currentSignature: '' });
    };

    const renderHeader = () => (
        <div className="relative z-10 flex justify-between items-center border-b bg-white shadow-sm p-2">
            {/* Tabs on the left */}
            <div className="flex">
                {(user.role === 'dev' || user.role === 'admin') && (
                    <TabButton name="Creation" activeTab={activeTab} setActiveTab={setActiveTab} />
                )}
                <TabButton name="Course" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton name="Candidate" activeTab={activeTab} setActiveTab={setActiveTab} />
                {(user.role === 'dev' || user.role === 'admin') && (
                    <TabButton name="Users" activeTab={activeTab} setActiveTab={setActiveTab} />
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
                {activeTab === 'course' && <CourseScreen user={user} openSignatureModal={openSignatureModal} />}
                {activeTab === 'candidate' && <CandidateScreen openSignatureModal={openSignatureModal} />}
            </div>
            {user.role === 'dev' && <DeveloperTools />}
            <SignatureModal 
                show={signatureModal.isOpen}
                onClose={closeSignatureModal}
                onSave={signatureModal.onSave}
                signatureData={signatureModal.currentSignature}
            />
        </div>
    );
};

export default Dashboard;