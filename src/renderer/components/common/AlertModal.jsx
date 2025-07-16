import React from 'react';

const AlertModal = ({ show, onClose, title, message }) => {
    if (!show) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="mb-6 text-gray-700">{message}</p>
                <button
                    onClick={onClose}
                    className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default AlertModal; 