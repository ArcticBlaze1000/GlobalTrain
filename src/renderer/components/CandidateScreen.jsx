import React, { useState, useEffect } from 'react';
import Dropdown from './common/Dropdown';

const CandidateScreen = () => {
    const [candidates, setCandidates] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    
    const [selectedCandidate, setSelectedCandidate] = useState('');
    const [selectedCompetency, setSelectedCompetency] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setCandidates(await window.db.query("SELECT id, forename || ' ' || surname AS name FROM trainees"));
                setCompetencies(await window.db.query('SELECT id, name FROM competencies'));
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };
        fetchData();
    }, []);

    const allFieldsFilled = selectedCandidate && selectedCompetency;

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Column */}
            <div className="w-1/5 bg-white p-6 shadow-md">
                <h2 className="text-xl font-bold mb-6">Candidate Selections</h2>
                
                <Dropdown
                    label="Candidate Name"
                    value={selectedCandidate}
                    onChange={setSelectedCandidate}
                    options={candidates}
                    defaultOptionText="Select Candidate"
                />

                <Dropdown
                    label="Competency"
                    value={selectedCompetency}
                    onChange={setSelectedCompetency}
                    options={competencies}
                    defaultOptionText="Select Competency"
                />

                {/* Leaving Checkbox */}
                <div className="flex items-center mt-4">
                    <input
                        type="checkbox"
                        id="leaving-checkbox"
                        checked={isLeaving}
                        onChange={e => setIsLeaving(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="leaving-checkbox" className="ml-2 block text-sm text-gray-900">
                        Leaving
                    </label>
                </div>
            </div>

            {/* Right Column */}
            <div className="w-4/5 p-10">
                <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-md">
                    {allFieldsFilled ? (
                        <p className="text-2xl text-gray-700">Questionnaires appear here</p>
                    ) : (
                        <p className="text-gray-500">Please make all selections to view questionnaires.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CandidateScreen; 