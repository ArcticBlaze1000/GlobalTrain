import React, { useState } from 'react';
import CreationScreen from './CreationScreen';
import CourseScreen from './CourseScreen';
import CandidateScreen from './CandidateScreen';
import UsersScreen from './UsersScreen';

const Dashboard = ({ user, onLogout }) => {
    // Set default tab based on role
    const getDefaultTab = () => {
        if (user.role === 'dev' || user.role === 'admin') return 'users';
        return 'course';
    };
    const [activeTab, setActiveTab] = useState(getDefaultTab());

    const renderHeader = () => (
        <div className="flex justify-between items-center border-b bg-white shadow-sm p-2">
            {/* Tabs on the left */}
            <div className="flex">
                {(user.role === 'dev' || user.role === 'admin') && (
                    <button
                        className={`py-2 px-6 text-sm font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                )}
                {user.role === 'dev' && (
                    <button
                        className={`py-2 px-6 text-sm font-medium ${activeTab === 'creation' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                        onClick={() => setActiveTab('creation')}
                    >
                        Creation
                    </button>
                )}
                <button
                    className={`py-2 px-6 text-sm font-medium ${activeTab === 'course' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('course')}
                >
                    Course
                </button>
                <button
                    className={`py-2 px-6 text-sm font-medium ${activeTab === 'candidate' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('candidate')}
                >
                    Candidate
                </button>
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
                {user.role === 'dev' && activeTab === 'creation' && <CreationScreen />}
                {activeTab === 'course' && <CourseScreen />}
                {activeTab === 'candidate' && <CandidateScreen />}
            </div>
        </div>
    );
};

export default Dashboard; 