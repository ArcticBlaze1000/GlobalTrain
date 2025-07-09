import React, { useState } from 'react';
import CoursesManagement from './Admin/CoursesManagement';
import FlagsManagement from './Admin/FlagsManagement';

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
                return <FlagsManagement user={user} />;
            case 'register':
                return <RegisterPlaceholder />;
            default:
                return <CoursesManagement user={user} />;
        }
    };

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Sidebar */}
            <div className="w-64 bg-gray-800 text-white flex-shrink-0">
                <div className="p-4 text-xl font-bold border-b border-gray-700">Admin Panel</div>
                <nav>
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
            <main className="flex-grow overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminScreen; 