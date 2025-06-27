import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateLeavingPdf } from './PDFGenerator';

// Debounce function to delay database updates
const debounce = (func, delay) => {
    let timeout;
    let lastArgs;

    const run = (args) => {
        if (!args) return;
        const result = func(...args);
        if (result && typeof result.then === 'function') {
            result.then(() => {
                if (lastArgs === args) {
                    lastArgs = null;
                }
            });
        } else {
            lastArgs = null;
        }
    };

    const debounced = (...args) => {
        lastArgs = args;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            run(lastArgs);
        }, delay);
    };

    debounced.flush = () => {
        clearTimeout(timeout);
        run(lastArgs);
    };

    return debounced;
};


const LeavingForm = ({ user, eventDetails, documentDetails, openSignatureModal, selectedTraineeId, onProgressUpdate }) => {
    const [responses, setResponses] = useState({
        leaving_reasons: '',
        leaving_candidate_signature: '',
        leaving_trainer_signature: '',
        leaving_date: '',
    });

    const { datapackId, documentId } = useMemo(() => ({
        datapackId: eventDetails?.id,
        documentId: documentDetails?.id,
    }), [eventDetails, documentDetails]);

    // --- Completion Calculation ---
    useEffect(() => {
        if (!documentId) return;

        const totalFields = Object.keys(responses).length;
        const filledFields = Object.values(responses).filter(value => {
            // Consider the field filled if the value is a non-empty string
            return typeof value === 'string' && value.trim() !== '';
        }).length;

        const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
        
        onProgressUpdate(documentId, percentage);
    }, [responses, documentId, onProgressUpdate]);


    // --- Data Fetching ---
    useEffect(() => {
        const fetchResponses = async () => {
            if (!datapackId || !documentId || !selectedTraineeId) return;

            const fetchedResponses = await window.db.query(
                'SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ? AND trainee_ids = ?',
                [datapackId, documentId, String(selectedTraineeId)]
            );

            if (fetchedResponses.length > 0) {
                const responsesMap = fetchedResponses.reduce((acc, res) => {
                    acc[res.field_name] = res.response_data;
                    return acc;
                }, {});
                setResponses(prev => ({ ...prev, ...responsesMap }));
            } else {
                // If no responses exist, create them
                Object.keys(responses).forEach(async (fieldName) => {
                    await window.db.run(
                        'INSERT OR IGNORE INTO responses (datapack_id, document_id, trainee_ids, field_name, response_data) VALUES (?, ?, ?, ?, ?)',
                        [datapackId, documentId, String(selectedTraineeId), fieldName, '']
                    );
                });
            }
        };

        fetchResponses();
    }, [datapackId, documentId, selectedTraineeId]);

    // --- Data Saving ---
    const debouncedSave = useCallback(debounce(async (fieldName, value) => {
        if (!datapackId || !documentId || !selectedTraineeId) return;
        await window.db.run(
            'UPDATE responses SET response_data = ? WHERE datapack_id = ? AND document_id = ? AND trainee_ids = ? AND field_name = ?',
            [value, datapackId, documentId, String(selectedTraineeId), fieldName]
        );
    }, 500), [datapackId, documentId, selectedTraineeId]);

    const handleInputChange = (fieldName, value) => {
        setResponses(prev => ({ ...prev, [fieldName]: value }));
        debouncedSave(fieldName, value);
    };

    // --- UI Rendering ---
    const renderSignatureBox = (fieldName, title) => {
        const signatureData = responses[fieldName];
        const isSigned = signatureData && signatureData.startsWith('data:image');

        return (
            <div>
                <label className="block text-sm font-bold mb-2">{title}</label>
                <div
                    className="w-full h-32 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50"
                    onClick={() => openSignatureModal(
                        (dataUrl) => handleInputChange(fieldName, dataUrl),
                        signatureData
                    )}
                >
                    {isSigned ? (
                        <img src={signatureData} alt="Signature" className="h-full w-full object-contain" />
                    ) : (
                        <span className="text-gray-500">Click to sign</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold text-center">Candidate Leaving Early</h2>
            
            <div>
                <label htmlFor="leaving_reasons" className="block text-sm font-bold mb-2">Reasons</label>
                <textarea
                    id="leaving_reasons"
                    value={responses.leaving_reasons}
                    onChange={(e) => handleInputChange('leaving_reasons', e.target.value)}
                    rows="6"
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter the reasons for the candidate leaving the course early..."
                />
            </div>

            <div className="p-4 bg-gray-100 rounded-md border border-gray-200">
                <p className="text-sm text-gray-700">
                    <span className="font-bold">Disclaimer:</span> I understand that leaving this course now means I will not be able to continue with the following days of this course.
                </p>
            </div>

            {renderSignatureBox('leaving_candidate_signature', 'Candidate Signature')}

            <div className="grid grid-cols-2 gap-6 items-end">
                <div>
                    <label className="block text-sm font-bold mb-2">Trainer Name</label>
                    <p className="p-2 bg-gray-200 rounded-md">{user.forename} {user.surname}</p>
                </div>
                {renderSignatureBox('leaving_trainer_signature', 'Trainer Signature')}
            </div>

            <div>
                <label htmlFor="leaving_date" className="block text-sm font-bold mb-2">Date</label>
                <input
                    type="date"
                    id="leaving_date"
                    value={responses.leaving_date}
                    onChange={(e) => handleInputChange('leaving_date', e.target.value)}
                    className="w-full p-2 border rounded-md"
                />
            </div>

            <div className="pt-4 text-center">
                <button
                    onClick={() => generateLeavingPdf(datapackId, selectedTraineeId, user)}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700"
                >
                    Generate PDF
                </button>
            </div>
        </div>
    );
};

export default LeavingForm; 