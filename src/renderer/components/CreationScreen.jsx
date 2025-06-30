import React, { useState, useEffect, useCallback } from 'react';
import Dropdown from './common/Dropdown';
import { debounce } from 'lodash';

const CreationScreen = () => {
    // --- STATE MANAGEMENT ---
    const [courses, setCourses] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [incompleteRegisters, setIncompleteRegisters] = useState([]);
    const [activeRegisterId, setActiveRegisterId] = useState(null); // Can be 'new' or an ID from the DB

    // Form State
    const [formState, setFormState] = useState({
        courseId: '',
        trainerId: '',
        startDate: '',
        duration: 1,
        trainees: []
    });

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchData = async () => {
            const [fetchedCourses, fetchedTrainers, fetchedRegisters] = await Promise.all([
                window.db.query('SELECT id, name, course_length FROM courses'),
                window.db.query("SELECT id, forename, surname FROM users WHERE role = 'trainer'"),
                window.db.query('SELECT r.id, r.updated_at, r.start_date, c.name as course_name FROM incomplete_registers r LEFT JOIN courses c ON r.course_id = c.id ORDER BY r.updated_at DESC')
            ]);
            setCourses(fetchedCourses);
            setTrainers(fetchedTrainers);
            setIncompleteRegisters(fetchedRegisters);
        };
        fetchData();
    }, []);

    // --- FORM LOGIC ---

    const handleFormChange = (field, value) => {
        setFormState(prev => {
            const newState = { ...prev, [field]: value };

            // If the course changes, automatically update the duration from the database value
            if (field === 'courseId') {
                const selectedCourse = courses.find(c => c.id === parseInt(value, 10));
                if (selectedCourse) {
                    newState.duration = selectedCourse.course_length || 1; // Default to 1 if not set
                }
            }
            return newState;
        });
    };

    const handleTraineeChange = (index, field, value) => {
        const updatedTrainees = [...formState.trainees];
        updatedTrainees[index][field] = value;
        handleFormChange('trainees', updatedTrainees);
    };

    const handleNumTraineesChange = (num) => {
        const count = Math.max(0, parseInt(num, 10) || 0);
        const currentTrainees = formState.trainees;
        let newTrainees = [...currentTrainees];

        if (count > currentTrainees.length) {
            for (let i = currentTrainees.length; i < count; i++) {
                newTrainees.push({ forename: '', surname: '', sponsor: '', sentry_number: '', has_comments: false, additional_comments: '' });
            }
        } else {
            newTrainees = newTrainees.slice(0, count);
        }
        handleFormChange('trainees', newTrainees);
    };

    const resetForm = () => {
        setFormState({
            courseId: '',
            trainerId: '',
            startDate: '',
            duration: 1,
            trainees: []
        });
        setActiveRegisterId(null);
    };
    
    // --- DATABASE INTERACTIONS ---

    const saveDraft = async (stateToSave) => {
        const { courseId, trainerId, startDate, duration, trainees } = stateToSave;
        const traineesJson = JSON.stringify(trainees);

        if (activeRegisterId && activeRegisterId !== 'new') {
            // Update existing draft
            await window.db.run(
                'UPDATE incomplete_registers SET course_id = ?, trainer_id = ?, start_date = ?, duration = ?, trainees_json = ? WHERE id = ?',
                [courseId, trainerId, startDate, duration, traineesJson, activeRegisterId]
            );
        } else {
            // Create new draft
            const result = await window.db.run(
                'INSERT INTO incomplete_registers (course_id, trainer_id, start_date, duration, trainees_json) VALUES (?, ?, ?, ?, ?)',
                [courseId, trainerId, startDate, duration, traineesJson]
            );
            setActiveRegisterId(result.lastID); // Set the new ID as active
        }
        // Refresh the list
        const fetchedRegisters = await window.db.query('SELECT r.id, r.updated_at, r.start_date, c.name as course_name FROM incomplete_registers r LEFT JOIN courses c ON r.course_id = c.id ORDER BY r.updated_at DESC');
        setIncompleteRegisters(fetchedRegisters);
    };
    
    // Debounced save function
    const debouncedSave = useCallback(debounce(saveDraft, 1500), [activeRegisterId]);

    useEffect(() => {
        if (activeRegisterId) { // Only save if a register is active
            debouncedSave(formState);
        }
        // Cleanup function to cancel any pending saves when component unmounts or dependencies change
        return () => {
            debouncedSave.cancel();
        };
    }, [formState, debouncedSave]);


    const handleSelectRegister = async (id) => {
        console.log(`[CreationScreen] Action: Load Register. ID: ${id}`);

        // Handle creating a completely new, blank register
        if (id === 'new') {
            console.log("[CreationScreen] Creating a new, blank register form.");
            resetForm();
            setActiveRegisterId('new');
            return;
        }

        try {
            // 1. Locate the row of info related to the incomplete form id
            console.log(`[CreationScreen] Fetching register ${id} from the database...`);
            const results = await window.db.query('SELECT * FROM incomplete_registers WHERE id = ?', [id]);
            const register = results[0]; // .query returns an array, so we take the first element

            if (!register) {
                console.error(`[CreationScreen] Error: No register found with ID ${id}.`);
                alert('Could not find the selected register. It may have been deleted.');
                return;
            }
            console.log(`[CreationScreen] Found register data:`, register);

            // 2. Take the info from there and prepopulate the boxes
            let trainees = [];
            if (register.trainees_json) {
                try {
                    trainees = JSON.parse(register.trainees_json);
                    if (!Array.isArray(trainees)) {
                         console.warn(`[CreationScreen] Parsed trainee data is not an array. Defaulting to empty.`, trainees);
                         trainees = [];
                    }
                } catch (e) {
                    console.error(`[CreationScreen] Error parsing trainee JSON for register ${id}.`, e);
                    alert('Could not load trainee details for this register due to invalid data. Starting with a blank list.');
                }
            }

            const newState = {
                courseId: register.course_id || '',
                trainerId: register.trainer_id || '',
                startDate: register.start_date || '',
                duration: register.duration || 1,
                trainees: trainees
            };

            console.log("[CreationScreen] Populating form with new state:", newState);
            setFormState(newState);

            // 3. Open the data entry canvas
            console.log("[CreationScreen] Displaying the form.");
            setActiveRegisterId(id);

        } catch (error) {
            console.error(`[CreationScreen] A critical error occurred while loading register ${id}:`, error);
            alert('An unexpected error stopped the register from loading. Please check the developer console for more details.');
        }
    };
    
    const handleDeleteRegister = async (e, id) => {
        e.stopPropagation();
        await window.db.run('DELETE FROM incomplete_registers WHERE id = ?', [id]);
        setIncompleteRegisters(prev => prev.filter(r => r.id !== id));
        if (activeRegisterId === id) {
            resetForm();
        }
    };

    const handleCreateEvent = async () => {
        // Validation
        if (!formState.courseId || !formState.trainerId || !formState.startDate || formState.trainees.length <= 0) {
            alert('Please fill out all required fields and add at least one trainee.');
            return;
        }

        try {
            // 1. Insert the new datapack first, but without the trainee_ids, to get its ID
            const datapackResult = await window.db.run(
                'INSERT INTO datapack (course_id, trainer_id, start_date, duration, total_trainee_count, trainee_ids) VALUES (?, ?, ?, ?, ?, ?)',
                [formState.courseId, formState.trainerId, formState.startDate, formState.duration, formState.trainees.length, ''] // trainee_ids is initially empty
            );
            const newDatapackId = datapackResult.lastID;

            // 2. Insert all trainees, linking them to the new datapack ID
            const insertedTraineeIds = [];
            for (const trainee of formState.trainees) {
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
            
            if (insertedTraineeIds.length !== formState.trainees.length) {
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
            const fetchedRegisters = await window.db.query('SELECT r.id, r.updated_at, r.start_date, c.name as course_name FROM incomplete_registers r LEFT JOIN courses c ON r.course_id = c.id ORDER BY r.updated_at DESC');
            setIncompleteRegisters(fetchedRegisters);
            resetForm();

        } catch (error) {
            console.error('Failed to create event:', error);
            alert(`An error occurred: ${error.message}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const renderRegistrationForm = () => (
        <div className="p-8 h-full overflow-y-auto relative">
             <button onClick={resetForm} className="absolute top-4 right-4 text-2xl font-bold text-gray-500 hover:text-gray-800">&times;</button>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">New Registration Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Dropdown
                    label="Course Title"
                    value={formState.courseId}
                    onChange={(val) => handleFormChange('courseId', val)}
                    options={courses}
                    placeholder="Select a course"
                />
                
                <Dropdown
                    label="Trainer"
                    value={formState.trainerId}
                    onChange={(val) => handleFormChange('trainerId', val)}
                    options={trainers}
                    placeholder="Select a trainer"
                />

                {/* Start Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input type="date" value={formState.startDate} onChange={e => handleFormChange('startDate', e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>

                {/* Course Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Duration (days)</label>
                    <input type="number" min="1" value={formState.duration} onChange={e => handleFormChange('duration', parseInt(e.target.value, 10))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            {/* Total Number of Trainees */}
            <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Total Number of Trainees</label>
                <input
                    type="number"
                    min="0"
                    value={formState.trainees.length}
                    onChange={(e) => handleNumTraineesChange(e.target.value)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>

            {/* Dynamic Trainee Inputs */}
            {formState.trainees.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Candidate Details</h3>
                    <div className="space-y-4">
                        {formState.trainees.map((trainee, index) => (
                            <div key={index} className="p-4 border rounded-md bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <input
                                        type="text" placeholder={`Forename ${index + 1}`} value={trainee.forename}
                                        onChange={e => handleTraineeChange(index, 'forename', e.target.value)} className="p-2 border rounded-md"
                                    />
                                    <input
                                        type="text" placeholder="Surname" value={trainee.surname}
                                        onChange={e => handleTraineeChange(index, 'surname', e.target.value)} className="p-2 border rounded-md"
                                    />
                                    <input
                                        type="text" placeholder="Sponsor" value={trainee.sponsor}
                                        onChange={e => handleTraineeChange(index, 'sponsor', e.target.value)} className="p-2 border rounded-md"
                                    />
                                    <input
                                        type="text" placeholder="Sentry Number" value={trainee.sentry_number}
                                        onChange={e => handleTraineeChange(index, 'sentry_number', e.target.value)} className="p-2 border rounded-md"
                                    />
                                </div>
                                <div className="mt-2 flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`other-checkbox-${index}`}
                                        checked={trainee.has_comments}
                                        onChange={e => handleTraineeChange(index, 'has_comments', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor={`other-checkbox-${index}`} className="ml-2 text-sm text-gray-900">Other</label>
                                </div>
                                {trainee.has_comments && (
                                    <div className="mt-2">
                                        <textarea
                                            placeholder="Enter any additional comments here..."
                                            value={trainee.additional_comments}
                                            onChange={e => handleTraineeChange(index, 'additional_comments', e.target.value)}
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
            <div className="w-1/5 bg-white p-6 shadow-md flex flex-col">
                <div>
                    <h2 className="text-xl font-bold mb-6">Create</h2>
                    <button
                        onClick={() => handleSelectRegister('new')}
                        className="w-full text-left p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        New Register
                    </button>
                </div>
                <div className="mt-8 border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Incomplete Registers</h3>
                    <div className="space-y-2">
                        {incompleteRegisters.map(reg => (
                            <div 
                                key={reg.id} 
                                onClick={() => handleSelectRegister(reg.id)}
                                className={`p-3 rounded-md cursor-pointer border flex justify-between items-center ${activeRegisterId === reg.id ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-50'}`}
                            >
                                <div>
                                    <p className="font-semibold">{reg.course_name || 'Untitled'}{reg.start_date ? `: ${formatDate(reg.start_date)}` : ''}</p>
                                    <p className="text-sm text-gray-500">
                                        Last saved: {new Date(reg.updated_at.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <button
                                   onClick={(e) => handleDeleteRegister(e, reg.id)}
                                   className="text-red-500 hover:text-red-700 font-bold"
                                   title="Delete Draft"
                                >
                                   &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column (Canvas) */}
            <div className="w-4/5 bg-white">
                {activeRegisterId ? (
                    renderRegistrationForm()
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select a register to edit or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreationScreen; 