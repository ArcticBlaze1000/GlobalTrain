import React, { useState, useEffect } from 'react';
import { generateTrackWalkDeliveryRequirementsPdf } from './PDFGenerator';

const Form = ({ user, eventDetails, documentDetails, onProgressUpdate, selectedTraineeId }) => {
    const [fileStatus, setFileStatus] = useState({ count: 0, expected: 0, status: '❌' });
    const [isLoading, setIsLoading] = useState(false);
    const [traineeName, setTraineeName] = useState('');

    useEffect(() => {
        const fetchTraineeName = async () => {
            if (selectedTraineeId) {
                const trainee = await window.db.query('SELECT forename, surname FROM trainees WHERE id = ?', [selectedTraineeId]);
                if (trainee.length > 0) {
                    setTraineeName(`${trainee[0].forename} ${trainee[0].surname}`);
                }
            }
        };
        fetchTraineeName();
    }, [selectedTraineeId]);

    const checkFileCount = async () => {
        if (!eventDetails || !user || !traineeName) return;
        
        setIsLoading(true);
        try {
            const trainer = await window.db.query('SELECT forename, surname FROM users WHERE id = ?', [eventDetails.trainer_id]);
            if (trainer.length === 0) return;
            
            const trainerName = `${trainer[0].forename} ${trainer[0].surname}`;
            const expectedCount = 1;
            const documentName = 'TrackWalkDeliveryRequirements';
            const courseName = eventDetails.courseName || eventDetails.name;
            
            const result = await window.electron.checkNonMandatoryDocumentCount({
                courseName: courseName,
                startDate: eventDetails.start_date,
                trainerName: trainerName,
                documentName: documentName,
                expectedCount: expectedCount,
                candidateName: traineeName,
            });
            
            setFileStatus(result);
            
            if (onProgressUpdate) {
                const completion = result.status === '✅' ? 100 : 0;
                onProgressUpdate(documentDetails.id, completion);
            }
            
        } catch (error) {
            console.error('Error checking file count:', error);
            setFileStatus({ count: 0, expected: 1, status: '❌', error: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        checkFileCount();
        const interval = setInterval(checkFileCount, 5000);
        return () => clearInterval(interval);
    }, [eventDetails, user, documentDetails, onProgressUpdate, traineeName]);

    const handleRefresh = () => {
        checkFileCount();
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold text-center">Track Walk Delivery Requirements</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Physical Document Status</h3>
                    <button onClick={handleRefresh} disabled={isLoading} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {isLoading ? 'Checking...' : 'Refresh'}
                    </button>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-2xl">{fileStatus.status}</span>
                    <div>
                        <p className="text-sm font-medium">Files: {fileStatus.count} / {fileStatus.expected}</p>
                        <p className="text-xs text-gray-600">
                            {fileStatus.status === '✅' 
                                ? 'Correct number of files found' 
                                : `Expected exactly ${fileStatus.expected} file, found ${fileStatus.count}`}
                        </p>
                        {fileStatus.error && <p className="text-xs text-red-600">Error: {fileStatus.error}</p>}
                    </div>
                </div>
                {fileStatus.folderPath && <p className="text-xs text-gray-500 mt-2">Folder: {fileStatus.folderPath}</p>}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Complete the Track Walk Delivery Requirements with the selected trainee.</li>
                    <li>2. Scan or save the completed document.</li>
                    <li>3. Save the file to the "TrackWalkDeliveryRequirements" folder within the trainee's "06 Candidate" directory.</li>
                    <li>4. Use naming convention: FirstName_LastName_TrackWalkDeliveryRequirements.pdf</li>
                    <li>5. Status shows ✅ when exactly 1 file is present.</li>
                </ol>
            </div>

            <div className="pt-4 text-center">
                <button
                    onClick={() => generateTrackWalkDeliveryRequirementsPdf(eventDetails.id, selectedTraineeId)}
                    disabled={fileStatus.status !== '✅'}
                    className={`px-6 py-2 font-bold rounded-md ${fileStatus.status === '✅' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
                >
                    Generate Summary PDF
                </button>
                {fileStatus.status !== '✅' && <p className="text-sm text-gray-600 mt-2">Complete file requirements to generate PDF</p>}
            </div>
        </div>
    );
};

export default Form; 