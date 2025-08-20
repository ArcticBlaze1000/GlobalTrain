import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SignatureModal = ({ show, onClose, onSave }) => {
    const sigPad = useRef(null);

    if (!show) {
        return null;
    }

    const handleClear = () => {
        sigPad.current.clear();
    };

    const handleSave = () => {
        if (sigPad.current.isEmpty()) {
            onSave(''); // Save an empty string if cleared
        } else {
            const dataUrl = sigPad.current.toDataURL('image/png');
            onSave(dataUrl);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-[9999]"
            onClick={onClose}
        >
            <div 
                className="bg-white p-6 rounded-lg shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold mb-4">Please Sign Below</h2>
                <div className="border rounded-md">
                    <SignatureCanvas
                        ref={sigPad}
                        penColor="black"
                        canvasProps={{ width: 400, height: 200, className: 'sigCanvas' }}
                    />
                </div>
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                    >
                        Clear
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700"
                    >
                        Save Signature
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal; 