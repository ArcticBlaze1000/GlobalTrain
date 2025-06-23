import React, { useState, useEffect } from 'react';

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
            traineeDetails[i] || { forename: '', surname: '', sponsor: '', sentry_number: '' }
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
            // 1. Insert all trainees and collect their IDs
            const insertedTraineeIds = [];
            for (const trainee of traineeDetails) {
                if (trainee.forename && trainee.surname) { // Only insert if name is provided
                    const result = await window.db.run(
                        'INSERT INTO trainees (forename, surname, sponsor, sentry_number) VALUES (?, ?, ?, ?)',
                        [trainee.forename, trainee.surname, trainee.sponsor, trainee.sentry_number]
                    );
                    insertedTraineeIds.push(result.lastID);
                }
            }
            
            if (insertedTraineeIds.length !== numTrainees) {
                alert('Some trainees were not added because they were missing a forename or surname.');
                // Decide if you want to continue or stop here
            }

            // 2. Format trainee IDs into a comma-separated string
            const traineeIdsString = insertedTraineeIds.join(',');

            // 3. Insert the new datapack
            await window.db.run(
                'INSERT INTO datapack (course_id, trainer_id, start_date, duration, total_trainee_count, trainee_ids) VALUES (?, ?, ?, ?, ?, ?)',
                [courseId, trainerId, startDate, duration, numTrainees, traineeIdsString]
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
                {/* Course Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Title</label>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="">Select a course</option>
                        {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                    </select>
                </div>

                {/* Trainer Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Trainer</label>
                    <select value={trainerId} onChange={e => setTrainerId(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="">Select a trainer</option>
                        {trainers.map(trainer => <option key={trainer.id} value={trainer.id}>{`${trainer.forename} ${trainer.surname}`}</option>)}
                    </select>
                </div>

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
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md bg-gray-50">
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