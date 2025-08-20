import React, { useState, useEffect } from 'react';
import SignatureModal from '../Common/SignatureModal';

// Dynamically imported forms
import PreCourseForm from '../General/PreCourse/Form';
import PostCourseForm from '../General/PostCourse/Form';
import LeavingForm from '../General/LeavingForm/Form';
import PracticalAssessmentIndividualForm from '../General/PracticalAssessmentIndividual/Form';
import AssessmentReviewForm from '../General/AssessmentReview/Form';
import CertificatesForm from '../General/Certificates/Form';
import KnowledgeAssessmentForm from '../General/KnowledgeAssessment/Form';
import LogbookEntriesForm from '../General/LogbookEntries/Form';
import QuestionnaireAndFeedbackForm from '../General/QuestionnaireAndFeedbackForm/Form';
import ScenarioAssessmentForm from '../General/ScenarioAssessment/Form';
import WorkbookForm from '../General/Workbook/Form';
import PhotographicIDForm from '../General/PhotographicID/Form';
import PhoneticQuizForm from '../PTS/PhoneticQuiz/Form';
import EmergencyPhoneCallExerciseForm from '../PTS/EmergencyPhoneCallExercise/Form';
import RecertEmergencyCallPracticalAssessmentForm from '../PTS/RecertEmergencyCallPracticalAssessment/Form';
import TrackWalkDeliveryRequirementsForm from '../PTS/TrackWalkDeliveryRequirements/Form';
import QuestionnaireForm from '../Common/QuestionnaireForm';


const formMap = {
    'PreCourse': PreCourseForm,
    'PostCourse': PostCourseForm,
    'LeavingForm': LeavingForm,
    'PracticalAssessmentIndividual': PracticalAssessmentIndividualForm,
    'AssessmentReview': AssessmentReviewForm,
    'Certificates': CertificatesForm,
    'KnowledgeAssessment': KnowledgeAssessmentForm,
    'LogbookEntries': LogbookEntriesForm,
    'QuestionnaireAndFeedbackForm': QuestionnaireAndFeedbackForm,
    'ScenarioAssessment': ScenarioAssessmentForm,
    'Workbook': WorkbookForm,
    'PhotographicID': PhotographicIDForm,
    'PhoneticQuiz': PhoneticQuizForm,
    'EmergencyPhoneCallExercise': EmergencyPhoneCallExerciseForm,
    'RecertEmergencyCallPracticalAssessment': RecertEmergencyCallPracticalAssessmentForm,
    'TrackWalkDeliveryRequirements': TrackWalkDeliveryRequirementsForm,
};

const DynamicFormProvider = ({ documentName, ...props }) => {
    const FormComponent = formMap[documentName] || QuestionnaireForm;
    return <FormComponent {...props} />;
};

const FlagDetailView = ({ flag, user, onBackToList, onUpdate, openSignatureModal }) => {
    // Local state to manage the flag's data dynamically
    const [currentFlag, setCurrentFlag] = useState(flag);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [signature, setSignature] = useState(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    
    // State for holding the data needed to render the form
    const [formData, setFormData] = useState({
        eventDetails: null,
        documentDetails: null,
        traineeDetails: null,
        isLoading: false,
    });

    useEffect(() => {
        setCurrentFlag(flag);
    }, [flag]);

    // Determines if the current user is the one who has the flag picked up
    const isCurrentUserAssignee = () => {
        if (currentFlag.status !== 'in-progress' || !currentFlag.attempted_by) return false;
        const attemptedByArray = JSON.parse(currentFlag.attempted_by);
        return attemptedByArray[attemptedByArray.length - 1] === user.id;
    };

    useEffect(() => {
        const fetchFormData = async () => {
            if (isCurrentUserAssignee() && currentFlag.datapack_id && currentFlag.document_id) {
                setFormData(prev => ({ ...prev, isLoading: true }));
                try {
                    const eventDetails = await window.db.query('SELECT * FROM datapack WHERE id = @param1', [currentFlag.datapack_id]);
                    const documentDetails = await window.db.query('SELECT * FROM documents WHERE id = @param1', [currentFlag.document_id]);
                    let traineeDetails = null;
                    if (currentFlag.trainee_id) {
                        traineeDetails = await window.db.query('SELECT * FROM trainees WHERE id = @param1', [currentFlag.trainee_id]);
                    }

                    setFormData({
                        eventDetails: eventDetails[0],
                        documentDetails: documentDetails[0],
                        traineeDetails: traineeDetails ? traineeDetails[0] : null,
                        isLoading: false
                    });
                } catch (error) {
                    console.error("Failed to fetch form data for flag:", error);
                    setFormData(prev => ({ ...prev, isLoading: false }));
                }
            }
        };

        fetchFormData();
    }, [currentFlag, user.id]);

    const handlePickUp = async () => {
        const now = new Date().toISOString();
        const newAttemptedBy = currentFlag.attempted_by ? JSON.parse(currentFlag.attempted_by) : [];
        const newPickedUpAt = currentFlag.picked_up_at ? JSON.parse(currentFlag.picked_up_at) : [];

        newAttemptedBy.push(user.id);
        newPickedUpAt.push(now);

        try {
            await window.db.query(
                "UPDATE flags SET status = 'in-progress', attempted_by = @param1, picked_up_at = @param2 WHERE id = @param3",
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
                "UPDATE flags SET status = 'open', dropped_at = @param1 WHERE id = @param2",
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
                "UPDATE flags SET status = 'rejected', resolved_at = @param1, resolved_by = @param2, resolution_notes = @param3 WHERE id = @param4",
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
                "UPDATE flags SET status = 'resolved', resolved_at = @param1, resolved_by = @param2, resolution_notes = @param3, signature = @param4 WHERE id = @param5",
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

            {isCurrentUserAssignee() && formData.documentDetails && (
                <div className="my-6">
                    <h3 className="text-2xl font-semibold text-gray-800 border-t pt-6 mt-6 mb-4">Live Document View</h3>
                    {formData.isLoading ? <p>Loading document...</p> : (
                        <div className="border p-4 rounded-md bg-gray-50">
                            <DynamicFormProvider
                                documentName={formData.documentDetails.name}
                                user={user}
                                eventDetails={formData.eventDetails}
                                documentDetails={formData.documentDetails}
                                selectedTraineeId={currentFlag.trainee_id}
                                traineeDetails={formData.traineeDetails}
                                openSignatureModal={openSignatureModal}
                            />
                        </div>
                    )}
                </div>
            )}

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