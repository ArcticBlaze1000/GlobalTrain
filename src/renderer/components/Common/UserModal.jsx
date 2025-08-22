import React from 'react';

const UserModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-[9999]"
            onClick={onClose}
        >
            <div 
                className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-6 text-gray-800">User Details</h2>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Forename</p>
                        <p className="text-lg text-gray-900">{user.forename}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Surname</p>
                        <p className="text-lg text-gray-900">{user.surname}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Role</p>
                        <p className="text-lg text-gray-900 capitalize">{user.role}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Username</p>
                        <p className="text-lg text-gray-900 font-mono bg-gray-100 p-2 rounded">{user.username}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Password</p>
                        <p className="text-lg text-gray-900 font-mono bg-gray-100 p-2 rounded">{user.password || 'Not Set'}</p>
                    </div>
                </div>
                <div className="mt-8 text-right">
                    <button
                        onClick={onClose}
                        className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserModal;
