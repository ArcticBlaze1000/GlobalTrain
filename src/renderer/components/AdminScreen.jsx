import React, { useState } from 'react';
import CoursesManagement from './Admin/CoursesManagement';
import FlagsManagement from './Admin/FlagsManagement';
import RegistersManagement from './Admin/RegistersManagement';

const AdminScreen = ({ user, openSignatureModal }) => {
    const [activeTab, setActiveTab] = useState('courses');

    const renderContent = () => {
        switch (activeTab) {
            case 'courses':
                return <CoursesManagement user={user} />;
            case 'flags':
                return <FlagsManagement user={user} openSignatureModal={openSignatureModal} />;
            case 'register':
                return <RegistersManagement user={user} openSignatureModal={openSignatureModal} />;
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