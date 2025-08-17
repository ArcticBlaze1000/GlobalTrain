import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';

const FlagModal = ({ show, onClose, user, page }) => {
    const { activeEvent, activeDocument, activeTrainee } = useEvent();
    const [title, setTitle] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [message, setMessage] = useState('');
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (show) {
            const fetchUsers = async () => {
                try {
                    const result = await window.db.query(
                        "SELECT id, forename, surname FROM users WHERE role = 'admin' OR role = 'dev'"
                    );
                    setUsers(result);
                } catch (error) {
                    console.error('Failed to fetch users:', error);
                }
            };
            fetchUsers();
        }
    }, [show]);

    if (!show) {
        return null;
    }

    const handleSubmit = async () => {
        if (!title || !selectedUser || !message) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const query = `
                INSERT INTO flags (title, datapack_id, document_id, trainee_id, user_id, user_sent_to_id, message, page)
                VALUES (@param1, @param2, @param3, @param4, @param5, @param6, @param7, @param8)
            `;
            const params = [
                title,
                activeEvent?.id || null,
                activeDocument?.id || null,
                activeTrainee?.id || null,
                user.id,
                selectedUser,
                message,
                page
            ];

            await window.db.query(query, params);
            setTitle('');
            setSelectedUser('');
            setMessage('');
            onClose();
        } catch (error) {
            console.error('Failed to submit flag:', error);
            alert('Failed to submit flag. Check console for details.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Raise a Flag</h2>
                
                <div className="mb-4">
                    <label htmlFor="flag-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        type="text"
                        id="flag-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="flag-to" className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <select
                        id="flag-to"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select a user</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.forename} {user.surname}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <label htmlFor="flag-message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                        id="flag-message"
                        rows="4"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlagModal; 