import React, { useState, useEffect } from 'react';
import { generateEmergencyPhoneCallExercisePdf } from './PDFGenerator';

const Form = ({ user, eventDetails, documentDetails, onProgressUpdate }) => {
    const [fileStatus, setFileStatus] = useState({ count: 0, expected: 0, status: '❌' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkFileCount = async () => {
            if (!eventDetails || !user) return;
            
            setIsLoading(true);
            try {
                // Get trainer info
                const trainer = await window.db.query('SELECT forename, surname FROM users WHERE id = ?', [eventDetails.trainer_id]);
                if (trainer.length === 0) return;
                
                const trainerName = `${trainer[0].forename} ${trainer[0].surname}`;
                
                // Get expected count (number of trainees)
                const traineeIds = eventDetails.trainee_ids ? eventDetails.trainee_ids.split(',') : [];
                const expectedCount = traineeIds.length;
                
                // Check file count in the folder
                const courseName = eventDetails.course_name || eventDetails.courseName || eventDetails.name;
                
                const result = await window.electron.checkNonMandatoryDocumentCount({
                    courseName: courseName,
                    startDate: eventDetails.start_date,
                    trainerName: trainerName,
                    documentName: 'EmergencyPhoneCallExercise',
                    expectedCount: expectedCount
                });
                
                setFileStatus(result);
                
                // Update progress based on file status
                const completion = result.status === '✅' ? 100 : 0;
                if (onProgressUpdate) {
                    onProgressUpdate(documentDetails.id, completion);
                }
                
            } catch (error) {
                console.error('Error checking file count:', error);
                setFileStatus({ count: 0, expected: 0, status: '❌', error: error.message });
            } finally {
                setIsLoading(false);
            }
        };

        checkFileCount();
        
        // Check every 5 seconds to update file count
        const interval = setInterval(checkFileCount, 5000);
        return () => clearInterval(interval);
        
    }, [eventDetails, user, documentDetails, onProgressUpdate]);

    const handleRefreshFileCount = () => {
        // Trigger immediate recheck
        const checkFileCount = async () => {
            if (!eventDetails || !user) return;
            
            setIsLoading(true);
            try {
                const trainer = await window.db.query('SELECT forename, surname FROM users WHERE id = ?', [eventDetails.trainer_id]);
                if (trainer.length === 0) return;
                
                const trainerName = `${trainer[0].forename} ${trainer[0].surname}`;
                const traineeIds = eventDetails.trainee_ids ? eventDetails.trainee_ids.split(',') : [];
                const expectedCount = traineeIds.length;
                
                const courseName = eventDetails.course_name || eventDetails.courseName || eventDetails.name;
                
                const result = await window.electron.checkNonMandatoryDocumentCount({
                    courseName: courseName,
                    startDate: eventDetails.start_date,
                    trainerName: trainerName,
                    documentName: 'EmergencyPhoneCallExercise',
                    expectedCount: expectedCount
                });
                
                setFileStatus(result);
                
                const completion = result.status === '✅' ? 100 : 0;
                if (onProgressUpdate) {
                    onProgressUpdate(documentDetails.id, completion);
                }
                
            } catch (error) {
                console.error('Error checking file count:', error);
                setFileStatus({ count: 0, expected: 0, status: '❌', error: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        
        checkFileCount();
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold text-center">Emergency Phone Call Exercise</h2>
            
            {/* File Status Section */}
            <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Physical Documents Status</h3>
                    <button
                        onClick={handleRefreshFileCount}
                        disabled={isLoading}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isLoading ? 'Checking...' : 'Refresh'}
                    </button>
                </div>
                
                <div className="flex items-center space-x-4">
                    <span className="text-2xl">{fileStatus.status}</span>
                    <div>
                        <p className="text-sm font-medium">
                            Files: {fileStatus.count} / {fileStatus.expected}
                        </p>
                        <p className="text-xs text-gray-600">
                            {fileStatus.status === '✅' 
                                ? 'Correct number of files found' 
                                : `Expected exactly ${fileStatus.expected} files, found ${fileStatus.count}`
                            }
                        </p>
                        {fileStatus.error && (
                            <p className="text-xs text-red-600">Error: {fileStatus.error}</p>
                        )}
                    </div>
                </div>
                
                {fileStatus.folderPath && (
                    <p className="text-xs text-gray-500 mt-2">
                        Folder: {fileStatus.folderPath}
                    </p>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2">Instructions:</h4>
                <ol className="text-sm text-red-800 space-y-1">
                    <li>1. Conduct emergency phone call exercises with each trainee</li>
                    <li>2. Record assessment results and observations</li>
                    <li>3. Scan or save completed assessment documents</li>
                    <li>4. Save files to the "EmergencyPhoneCallExercise" folder in "Non Mandatory Files"</li>
                    <li>5. Use naming convention: FirstName_LastName_EmergencyCall.pdf</li>
                    <li>6. Status shows ✅ when exactly {fileStatus.expected} files are present</li>
                </ol>
            </div>

            {/* Generate PDF Button */}
            <div className="pt-4 text-center">
                <button
                    onClick={() => generateEmergencyPhoneCallExercisePdf(eventDetails.id)}
                    disabled={fileStatus.status !== '✅'}
                    className={`px-6 py-2 font-bold rounded-md ${
                        fileStatus.status === '✅'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    }`}
                >
                    Generate Summary PDF
                </button>
                {fileStatus.status !== '✅' && (
                    <p className="text-sm text-gray-600 mt-2">
                        Complete file requirements to generate PDF
                    </p>
                )}
            </div>
        </div>
    );
};

export default Form;
