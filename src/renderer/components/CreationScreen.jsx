import React, { useState, useEffect } from 'react';
import Dropdown from './common/Dropdown';

const CreationScreen = () => {
    // Component State
    const [showForm, setShowForm] = useState(false);
    const [courses, setCourses] = useState([]);
    const [trainers, setTrainers] = useState([]);
    
    // Form State
    const [courseId, setCourseId] = useState('');
    const [trainerId, setTrainerId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [duration, setDuration] = useState(1);
    const [numTrainees, setNumTrainees] = useState(0);
    const [traineeDetails, setTraineeDetails] = useState([]);

    // Fetch initial data for dropdowns
    useEffect(() => {
        const fetchData = async () => {
            setCourses(await window.db.query('SELECT * FROM courses'));
            // Fetch users with the 'trainer' role
            const trainerUsers = await window.db.query("SELECT id, forename, surname FROM users WHERE role = 'trainer'");
            setTrainers(trainerUsers);
        };
        fetchData();
    }, []);

    // Adjust the trainee details array when the number of trainees changes
    useEffect(() => {
        const newTraineeDetails = Array.from({ length: numTrainees }, (_, i) =>
            traineeDetails[i] || { forename: '', surname: '', sponsor: '', sentry_number: '', has_comments: false, additional_comments: '' }
        );
        setTraineeDetails(newTraineeDetails);
    }, [numTrainees]);

    const handleTraineeDetailChange = (index, field, value) => {
        const updatedTrainees = [...traineeDetails];
        updatedTrainees[index][field] = value;
        setTraineeDetails(updatedTrainees);
    };
    
    const resetForm = () => {
        setCourseId('');
        setTrainerId('');
        setStartDate('');
        setDuration(1);
        setNumTrainees(0);
        setTraineeDetails([]);
    };

    const handleCreateEvent = async () => {
        // Validation
        if (!courseId || !trainerId || !startDate || numTrainees <= 0) {
            alert('Please fill out all required fields and add at least one trainee.');
            return;
        }

        try {
            // 1. Insert the new datapack first, but without the trainee_ids, to get its ID
            const datapackResult = await window.db.run(
                'INSERT INTO datapack (course_id, trainer_id, start_date, duration, total_trainee_count, trainee_ids) VALUES (?, ?, ?, ?, ?, ?)',
                [courseId, trainerId, startDate, duration, numTrainees, ''] // trainee_ids is initially empty
            );
            const newDatapackId = datapackResult.lastID;

            // 2. Insert all trainees, linking them to the new datapack ID
            const insertedTraineeIds = [];
            for (const trainee of traineeDetails) {
                if (trainee.forename && trainee.surname) { // Only insert if name is provided
                    const traineeResult = await window.db.run(
                        'INSERT INTO trainees (forename, surname, sponsor, sentry_number, additional_comments, datapack) VALUES (?, ?, ?, ?, ?, ?)',
                        [trainee.forename, trainee.surname, trainee.sponsor, trainee.sentry_number, trainee.additional_comments, newDatapackId]
                    );
                    insertedTraineeIds.push(traineeResult.lastID);

                    // Also create a user account for the trainee
                    try {
                        const username = trainee.forename.toLowerCase();
                        const password = trainee.surname.toLowerCase();
                        await window.db.run(
                            'INSERT INTO users (forename, surname, role, username, password) VALUES (?, ?, ?, ?, ?)',
                            [trainee.forename, trainee.surname, 'candidate', username, password]
                        );
                    } catch (userError) {
                        console.warn(`Could not create user for ${trainee.forename} ${trainee.surname}. It might already exist. Error: ${userError.message}`);
                    }
                }
            }
            
            if (insertedTraineeIds.length !== numTrainees) {
                alert('Some trainees were not added because they were missing a forename or surname.');
            }

            // 3. Now, update the datapack with the collected trainee IDs
            const traineeIdsString = insertedTraineeIds.join(',');
            await window.db.run(
                'UPDATE datapack SET trainee_ids = ? WHERE id = ?',
                [traineeIdsString, newDatapackId]
            );

            // 4. Show success and clear the form
            alert('Event created successfully!');
            resetForm();

        } catch (error) {
            console.error('Failed to create event:', error);
            alert(`An error occurred: ${error.message}`);
        }
    };

    const renderRegistrationForm = () => (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">New Registration Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Dropdown
                    label="Course Title"
                    value={courseId}
                    onChange={setCourseId}
                    options={courses}
                    placeholder="Select a course"
                />
                
                <Dropdown
                    label="Trainer"
                    value={trainerId}
                    onChange={setTrainerId}
                    options={trainers}
                    placeholder="Select a trainer"
                />

                {/* Start Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>

                {/* Course Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Duration (days)</label>
                    <input type="number" min="1" value={duration} onChange={e => setDuration(parseInt(e.target.value, 10))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            {/* Total Number of Trainees */}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Total Number of Trainees</label>
                <input
                    type="number"
                    min="0"
                    value={numTrainees}
                    onChange={(e) => setNumTrainees(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>

            {/* Dynamic Trainee Inputs */}
            {numTrainees > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Candidate Details</h3>
                    <div className="space-y-4">
                        {traineeDetails.map((trainee, index) => (
                            <div key={index} className="p-4 border rounded-md bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <input
                                        type="text" placeholder={`Forename ${index + 1}`} value={trainee.forename}
                                        onChange={e => handleTraineeDetailChange(index, 'forename', e.target.value)} className="p-2 border rounded-md"
                                    />
                                    <input
                                        type="text" placeholder="Surname" value={trainee.surname}
                                        onChange={e => handleTraineeDetailChange(index, 'surname', e.target.value)} className="p-2 border rounded-md"
                                    />
                                    <input
                                        type="text" placeholder="Sponsor" value={trainee.sponsor}
                                        onChange={e => handleTraineeDetailChange(index, 'sponsor', e.target.value)} className="p-2 border rounded-md"
                                    />
                                    <input
                                        type="text" placeholder="Sentry Number" value={trainee.sentry_number}
                                        onChange={e => handleTraineeDetailChange(index, 'sentry_number', e.target.value)} className="p-2 border rounded-md"
                                    />
                                </div>
                                <div className="mt-2 flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`other-checkbox-${index}`}
                                        checked={trainee.has_comments}
                                        onChange={e => handleTraineeDetailChange(index, 'has_comments', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`other-checkbox-${index}`} className="ml-2 text-sm text-gray-900">Other</label>
                                </div>
                                {trainee.has_comments && (
                                    <div className="mt-2">
                                        <textarea
                                            placeholder="Enter any additional comments here..."
                                            value={trainee.additional_comments}
                                            onChange={e => handleTraineeDetailChange(index, 'additional_comments', e.target.value)}
                                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                            rows="2"
                                        ></textarea>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Event Button */}
            <div className="mt-8 text-right">
                <button onClick={handleCreateEvent} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                    Create New Event
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Column */}
            <div className="w-1/5 bg-white p-6 shadow-md">
                <h2 className="text-xl font-bold mb-6">Create</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full text-left p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Register
                </button>
            </div>

            {/* Right Column (Canvas) */}
            <div className="w-4/5 bg-white">
                {showForm ? (
                    renderRegistrationForm()
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select an action from the left menu.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreationScreen; 