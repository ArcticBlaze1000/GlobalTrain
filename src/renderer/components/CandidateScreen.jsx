import React, { useState, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import Dropdown from './common/Dropdown';

const CandidateScreen = () => {
    // Shared state from context
    const { activeEvent } = useEvent();

    // State for data
    const [candidates, setCandidates] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);

    // State for form controls
    const [selectedCandidateId, setSelectedCandidateId] = useState('');
    const [selectedCompetencyId, setSelectedCompetencyId] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);

    // Effect to fetch candidates when the active event changes
    useEffect(() => {
        const fetchTraineesForEvent = async () => {
            setCandidates([]);
            setSelectedCandidateId('');
            if (!activeEvent || !activeEvent.id) return;

            try {
                const datapack = await window.db.query('SELECT trainee_ids FROM datapack WHERE id = ?', [activeEvent.id]);
                if (!datapack.length || !datapack[0].trainee_ids) return;

                const traineeIds = datapack[0].trainee_ids.split(',').map(Number);
                if (traineeIds.length === 0) return;

                const placeholders = traineeIds.map(() => '?').join(',');
                const query = `SELECT id, forename, surname FROM trainees WHERE id IN (${placeholders})`;
                const traineeDetails = await window.db.query(query, traineeIds);

                const formattedCandidates = traineeDetails.map(t => ({ id: t.id, name: `${t.forename} ${t.surname}` }));
                setCandidates(formattedCandidates);
            } catch (error) {
                console.error('Failed to fetch trainees for event:', error);
            }
        };
        fetchTraineesForEvent();
    }, [activeEvent]);

    // Effect to fetch all competencies once on mount
    useEffect(() => {
        const fetchCompetencies = async () => {
            try {
                const results = await window.db.query('SELECT id, name FROM competencies');
                setCompetencies(results);
            } catch (error) {
                console.error('Failed to fetch competencies:', error);
            }
        };
        fetchCompetencies();
    }, []);

    // Effect to fetch details when a candidate is selected
    useEffect(() => {
        const fetchCandidateDetails = async () => {
            if (!selectedCandidateId) {
                setSelectedCandidateDetails(null);
                return;
            }
            try {
                const details = await window.db.query('SELECT * FROM trainees WHERE id = ?', [selectedCandidateId]);
                setSelectedCandidateDetails(details.length > 0 ? details[0] : null);
            } catch (error) {
                console.error('Failed to fetch candidate details:', error);
                setSelectedCandidateDetails(null);
            }
        };
        fetchCandidateDetails();
    }, [selectedCandidateId]);

    // Render a placeholder if no event is selected
    if (!activeEvent || !activeEvent.id) {
        return (
            <div className="flex items-center justify-center h-full p-6 bg-gray-50">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-700">No Event Selected</h3>
                    <p className="text-gray-500">Please go to the "Course" tab and select an event to view candidates.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-50">
            {/* Left Column for Controls */}
            <div className="w-1/4 bg-white p-6 border-r">
                <h2 className="text-xl font-bold mb-6">Candidate Selections</h2>
                <div className="space-y-6">
                    <Dropdown
                        label="Candidate"
                        value={selectedCandidateId}
                        onChange={setSelectedCandidateId}
                        options={candidates}
                        placeholder="Select Candidate"
                    />
                    <Dropdown
                        label="Competency"
                        value={selectedCompetencyId}
                        onChange={setSelectedCompetencyId}
                        options={competencies}
                        placeholder="Select Competency"
                    />
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="leaving-checkbox"
                            checked={isLeaving}
                            onChange={e => setIsLeaving(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="leaving-checkbox" className="ml-2 block text-sm font-medium text-gray-700">
                            Leaving
                        </label>
                    </div>
                </div>
            </div>

            {/* Right Column for Display */}
            <div className="w-3/4 p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Event: {activeEvent.courseName} — {activeEvent.startDate}
                </h2>

                {selectedCandidateDetails ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold border-b pb-2 mb-4 text-gray-700">
                            {selectedCandidateDetails.forename} {selectedCandidateDetails.surname}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Sponsor</p>
                                <p className="text-lg font-semibold">{selectedCandidateDetails.sponsor}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Sentry Number</p>
                                <p className="text-lg font-semibold">{selectedCandidateDetails.sentry_number}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-md">
                         <p className="text-gray-500">Select a candidate to view their details.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CandidateScreen; 