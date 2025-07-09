import React, { useState, useEffect } from 'react';
import SignatureModal from '../Common/SignatureModal';

const FlagDetailView = ({ flag, user, onBackToList, onUpdate }) => {
    // Local state to manage the flag's data dynamically
    const [currentFlag, setCurrentFlag] = useState(flag);
    useEffect(() => {
        setCurrentFlag(flag);
    }, [flag]);
    
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [signature, setSignature] = useState(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    // Determines if the current user is the one who has the flag picked up
    const isCurrentUserAssignee = () => {
        if (currentFlag.status !== 'in-progress' || !currentFlag.attempted_by) return false;
        const attemptedByArray = JSON.parse(currentFlag.attempted_by);
        return attemptedByArray[attemptedByArray.length - 1] === user.id;
    };

    const handlePickUp = async () => {
        const now = new Date().toISOString();
        const newAttemptedBy = currentFlag.attempted_by ? JSON.parse(currentFlag.attempted_by) : [];
        const newPickedUpAt = currentFlag.picked_up_at ? JSON.parse(currentFlag.picked_up_at) : [];

        newAttemptedBy.push(user.id);
        newPickedUpAt.push(now);

        try {
            await window.db.query(
                "UPDATE flags SET status = 'in-progress', attempted_by = ?, picked_up_at = ? WHERE id = ?",
                [JSON.stringify(newAttemptedBy), JSON.stringify(newPickedUpAt), currentFlag.id]
            );
            const updatedFlag = {
                ...currentFlag,
                status: 'in-progress',
                attempted_by: JSON.stringify(newAttemptedBy),
                picked_up_at: JSON.stringify(newPickedUpAt)
            };
            onUpdate(updatedFlag);
        } catch (error) {
            console.error("Failed to pick up flag:", error);
        }
    };

    const handleDrop = async () => {
        const now = new Date().toISOString();
        const newDroppedAt = currentFlag.dropped_at ? JSON.parse(currentFlag.dropped_at) : [];
        newDroppedAt.push(now);

        try {
            await window.db.query(
                "UPDATE flags SET status = 'open', dropped_at = ? WHERE id = ?",
                [JSON.stringify(newDroppedAt), currentFlag.id]
            );
            const updatedFlag = { ...currentFlag, status: 'open', dropped_at: JSON.stringify(newDroppedAt) };
            onUpdate(updatedFlag);
        } catch (error) {
            console.error("Failed to drop flag:", error);
        }
    };
    
    const handleReject = async () => {
        const now = new Date().toISOString();
        try {
            await window.db.query(
                "UPDATE flags SET status = 'rejected', resolved_at = ?, resolved_by = ?, resolution_notes = ? WHERE id = ?",
                [now, user.id, resolutionNotes, currentFlag.id]
            );
            const updatedFlag = { ...currentFlag, status: 'rejected', resolved_at: now, resolved_by: user.id, resolution_notes: resolutionNotes };
            onUpdate(updatedFlag);
        } catch (error) {
            console.error("Failed to reject flag:", error);
        }
    };

    const handleResolve = async () => {
        const now = new Date().toISOString();
        try {
            await window.db.query(
                "UPDATE flags SET status = 'resolved', resolved_at = ?, resolved_by = ?, resolution_notes = ?, signature = ? WHERE id = ?",
                [now, user.id, resolutionNotes, signature, currentFlag.id]
            );
            const updatedFlag = { ...currentFlag, status: 'resolved', resolved_at: now, resolved_by: user.id, resolution_notes: resolutionNotes, signature: signature };
            onUpdate(updatedFlag);
        } catch (error) {
            console.error("Failed to resolve flag:", error);
        }
    };

    const DetailItem = ({ label, value }) => (
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-lg">{value || 'N/A'}</p>
        </div>
    );

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('en-GB') : 'N/A';

    return (
        <div className="p-6 bg-white shadow-lg rounded-lg">
            <button onClick={onBackToList} className="mb-4 text-indigo-600 hover:text-indigo-900 font-semibold">
                &larr; Back to List
            </button>
            <h2 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">{currentFlag.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <DetailItem label="Raised By" value={currentFlag.raised_by} />
                <DetailItem label="Sent To" value={currentFlag.sent_to} />
                <DetailItem label="Page" value={currentFlag.page} />
                <DetailItem label="Created At" value={formatDate(currentFlag.created_at)} />
                <DetailItem label="Picked Up At" value={formatDate(currentFlag.picked_up_at ? JSON.parse(currentFlag.picked_up_at).slice(-1)[0] : null)} />
                <DetailItem label="Resolved At" value={formatDate(currentFlag.resolved_at)} />
            </div>

            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Message</h3>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-md whitespace-pre-wrap">{currentFlag.message}</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Resolve Flag</h3>
                
                {/* --- Action Buttons --- */}
                {currentFlag.status === 'open' && (
                     <div className="flex space-x-2 mb-4">
                        <button
                            onClick={handlePickUp}
                            className="w-1/2 py-2 px-4 bg-yellow-500 text-white font-bold rounded-md hover:bg-yellow-600"
                        >
                            Pick Up
                        </button>
                        <button
                            onClick={handleReject}
                            className="w-1/2 py-2 px-4 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
                        >
                            Reject
                        </button>
                    </div>
                )}

                {isCurrentUserAssignee() && (
                    <div className="flex space-x-2 mb-4">
                        <button
                            onClick={handleDrop}
                            className="w-1/2 py-2 px-4 bg-yellow-500 text-white font-bold rounded-md hover:bg-yellow-600"
                        >
                            Drop
                        </button>
                        <button
                            onClick={handleReject}
                            className="w-1/2 py-2 px-4 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
                        >
                            Reject
                        </button>
                    </div>
                )}
                
                <div className="mb-4">
                    <label htmlFor="resolution-notes" className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                    <textarea
                        id="resolution-notes"
                        rows="4"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your resolution notes here..."
                        disabled={!isCurrentUserAssignee()}
                    ></textarea>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setIsSignatureModalOpen(true)} 
                            className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                            disabled={!isCurrentUserAssignee()}
                        >
                            {signature ? 'Edit Signature' : 'Add Signature'}
                        </button>
                        {signature && <img src={signature} alt="Signature" className="h-12 border rounded-md" />}
                    </div>
                </div>

                <button 
                    onClick={handleResolve}
                    className="w-full py-2 px-4 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    disabled={!resolutionNotes || !signature || !isCurrentUserAssignee()}
                >
                    Resolve Flag
                </button>
            </div>

            <SignatureModal
                show={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={(dataUrl) => {
                    setSignature(dataUrl);
                    setIsSignatureModalOpen(false);
                }}
                signatureData={signature}
            />
        </div>
    );
};

export default FlagDetailView; 