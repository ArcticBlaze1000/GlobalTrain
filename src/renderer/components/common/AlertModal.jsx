import React from 'react';

const AlertModal = ({ isOpen, onClose, title, message, confirmText, onConfirm, cancelText = 'Cancel' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{message}</p>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal; 