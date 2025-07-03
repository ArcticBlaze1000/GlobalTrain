import React, { useState } from 'react';
import CoursesManagement from './admin/CoursesManagement';

const FlagsPlaceholder = () => (
    <div className="flex-grow p-6">
        <h2 className="text-3xl font-bold text-gray-800">Flags Management</h2>
        <p className="mt-2 text-gray-600">This area is under construction.</p>
    </div>
);

const RegisterPlaceholder = () => (
    <div className="flex-grow p-6">
        <h2 className="text-3xl font-bold text-gray-800">Register Management</h2>
        <p className="mt-2 text-gray-600">This area is under construction.</p>
    </div>
);

const AdminScreen = ({ user }) => {
    const [activeTab, setActiveTab] = useState('courses');

    const renderContent = () => {
        switch (activeTab) {
            case 'courses':
                return <CoursesManagement user={user} />;
            case 'flags':
                return <FlagsPlaceholder />;
            case 'register':
                return <RegisterPlaceholder />;
            default:
                return <CoursesManagement user={user} />;
        }
    };

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Sidebar */}
            <div className="w-64 bg-gray-800 text-white flex flex-col">
                <div className="p-4 text-xl font-bold border-b border-gray-700">Admin Panel</div>
                <nav className="flex-grow">
                    <ul>
                        <li
                            className={`p-4 cursor-pointer hover:bg-gray-700 ${activeTab === 'courses' ? 'bg-gray-900' : ''}`}
                            onClick={() => setActiveTab('courses')}
                        >
                            Courses
                        </li>
                        <li
                            className={`p-4 cursor-pointer hover:bg-gray-700 ${activeTab === 'flags' ? 'bg-gray-900' : ''}`}
                            onClick={() => setActiveTab('flags')}
                        >
                            Flags
                        </li>
                        <li
                            className={`p-4 cursor-pointer hover:bg-gray-700 ${activeTab === 'register' ? 'bg-gray-900' : ''}`}
                            onClick={() => setActiveTab('register')}
                        >
                            Register
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminScreen; 