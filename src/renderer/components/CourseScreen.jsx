import React, { useState, useEffect } from 'react';

const CourseScreen = () => {
    const [trainers, setTrainers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [trainees, setTrainees] = useState([]);
    const [competencies, setCompetencies] = useState([]);

    const [selectedTrainer, setSelectedTrainer] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedTrainee, setSelectedTrainee] = useState('');
    const [selectedCompetency, setSelectedCompetency] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setTrainers(await window.db.query('SELECT * FROM trainers'));
            setCourses(await window.db.query('SELECT * FROM courses'));
            setTrainees(await window.db.query('SELECT * FROM trainees'));
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            const fetchCompetencies = async () => {
                const results = await window.db.query('SELECT * FROM competencies WHERE course_id = ?', [selectedCourse]);
                setCompetencies(results);
            };
            fetchCompetencies();
        } else {
            setCompetencies([]);
        }
        setSelectedCompetency(''); // Reset competency when course changes
    }, [selectedCourse]);

    const handleSaveProgress = async () => {
        if (allDropdownsSelected) {
            await window.db.query(
                'INSERT INTO selections (trainer_id, course_id, trainee_id, competency_id) VALUES (?, ?, ?, ?)',
                [selectedTrainer, selectedCourse, selectedTrainee, selectedCompetency]
            );
            alert('Progress Saved!');
        } else {
            alert('Please select a value from all dropdowns.');
        }
    };
    
    const allDropdownsSelected = selectedTrainer && selectedCourse && selectedTrainee && selectedCompetency;

    const renderDropdown = (label, value, onChange, options) => (
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="">Select {label}</option>
                {options.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Column */}
            <div className="w-1/5 bg-white p-6 shadow-md">
                <h2 className="text-xl font-bold mb-6">Course Selections</h2>
                {renderDropdown('Trainer', selectedTrainer, setSelectedTrainer, trainers)}
                {renderDropdown('Course', selectedCourse, setSelectedCourse, courses)}
                {renderDropdown('Trainee', selectedTrainee, setSelectedTrainee, trainees)}
                {renderDropdown('Competency', selectedCompetency, setSelectedCompetency, competencies)}
            </div>

            {/* Right Column */}
            <div className="w-4/5 p-10">
                <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg shadow-md">
                    {allDropdownsSelected ? (
                        <div>
                            <p className="text-2xl text-gray-700">Questionnaires appear here</p>
                            <button
                                onClick={handleSaveProgress}
                                className="mt-8 px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none"
                            >
                                Save Progress
                            </button>
                        </div>
                    ) : (
                        <p className="text-gray-500">Please make all selections to view questionnaires.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseScreen; 