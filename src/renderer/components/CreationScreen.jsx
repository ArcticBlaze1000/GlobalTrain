import React, { useState, useEffect } from 'react';

const CreationScreen = () => {
    const [showForm, setShowForm] = useState(false);
    const [courses, setCourses] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [numTrainees, setNumTrainees] = useState(0);
    const [traineeDetails, setTraineeDetails] = useState([]);

    // Fetch initial data for dropdowns
    useEffect(() => {
        const fetchData = async () => {
            setCourses(await window.db.query('SELECT * FROM courses'));
            setTrainers(await window.db.query('SELECT * FROM trainers'));
        };
        fetchData();
    }, []);

    // Adjust the trainee details array when the number of trainees changes
    useEffect(() => {
        const newTraineeDetails = Array.from({ length: numTrainees }, (_, i) =>
            traineeDetails[i] || { name: '', sponsor: '', sentryNumber: '' }
        );
        setTraineeDetails(newTraineeDetails);
    }, [numTrainees]);

    const handleTraineeDetailChange = (index, field, value) => {
        const updatedTrainees = [...traineeDetails];
        updatedTrainees[index][field] = value;
        setTraineeDetails(updatedTrainees);
    };

    const renderRegistrationForm = () => (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">New Registration Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Course Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Title</label>
                    <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option>Select a course</option>
                        {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                    </select>
                </div>

                {/* Trainer */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Trainer</label>
                    <select className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option>Select a trainer</option>
                        {trainers.map(trainer => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
                    </select>
                </div>

                {/* Start Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input type="date" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>

                {/* Course Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Duration (days)</label>
                    <input type="number" min="1" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
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
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-gray-50">
                                <input
                                    type="text"
                                    placeholder={`Candidate Name ${index + 1}`}
                                    value={trainee.name}
                                    onChange={e => handleTraineeDetailChange(index, 'name', e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                />
                                <input
                                    type="text"
                                    placeholder="Sponsor"
                                    value={trainee.sponsor}
                                    onChange={e => handleTraineeDetailChange(index, 'sponsor', e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                />
                                <input
                                    type="text"
                                    placeholder="Sentry Number"
                                    value={trainee.sentryNumber}
                                    onChange={e => handleTraineeDetailChange(index, 'sentryNumber', e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Generate PDF Button */}
            <div className="mt-8 text-right">
                <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                    Generate PDF
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