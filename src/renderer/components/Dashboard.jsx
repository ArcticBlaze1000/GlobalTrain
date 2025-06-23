import React, { useState } from 'react';
import CreationScreen from './CreationScreen';
import CourseScreen from './CourseScreen';
import CandidateScreen from './CandidateScreen';

const Dashboard = ({ userRole, onLogout }) => {
    const [activeTab, setActiveTab] = useState(userRole === 'Admin' ? 'creation' : 'course');

    const renderHeader = () => (
        <div className="flex justify-between items-center border-b bg-white shadow-sm p-2">
            {/* Tabs on the left */}
            <div className="flex">
                {userRole === 'Admin' && (
                    <button
                        className={`py-2 px-6 text-sm font-medium transition-colors duration-200 ${activeTab === 'creation' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                        onClick={() => setActiveTab('creation')}
                    >
                        Creation
                    </button>
                )}
                <button
                    className={`py-2 px-6 text-sm font-medium transition-colors duration-200 ${activeTab === 'course' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('course')}
                >
                    Course
                </button>
                <button
                    className={`py-2 px-6 text-sm font-medium transition-colors duration-200 ${activeTab === 'candidate' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('candidate')}
                >
                    Candidate
                </button>
            </div>

            {/* Logout button on the right */}
            <button
                onClick={onLogout}
                className="py-1 px-3 text-sm text-red-500 border border-red-500 rounded-md hover:bg-red-500 hover:text-white transition-colors duration-200"
            >
                Logout
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-screen">
            {renderHeader()}
            <div className="flex-grow">
                {userRole === 'Admin' && activeTab === 'creation' && <CreationScreen />}
                {activeTab === 'course' && <CourseScreen />}
                {activeTab === 'candidate' && <CandidateScreen />}
            </div>
        </div>
    );
};

export default Dashboard; 