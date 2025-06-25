import React, { useState } from 'react';

const DeveloperTools = () => {
    // This component will only be rendered in development mode.
    if (process.env.NODE_ENV === 'production') {
        return null;
    }

    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRegenerate = async () => {
        setIsProcessing(true);
        setMessage('');
        if (window.dev_regenerateLastPdf && typeof window.dev_regenerateLastPdf === 'function') {
            try {
                await window.dev_regenerateLastPdf();
                setMessage('PDF regenerated successfully.');
            } catch (error) {
                console.error('Failed to regenerate PDF:', error);
                setMessage(`Error: ${error.message}`);
            }
        } else {
            setMessage('You must generate a PDF first in this session.');
        }
        setIsProcessing(false);
    };

    return (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-50">
            <h3 className="font-bold text-base mb-2">Dev Tools</h3>
            <button
                onClick={handleRegenerate}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isProcessing ? 'Generating...' : 'Regenerate Last PDF'}
            </button>
            {message && <p className="text-xs mt-2 text-center text-gray-400">{message}</p>}
        </div>
    );
};

export default DeveloperTools; 