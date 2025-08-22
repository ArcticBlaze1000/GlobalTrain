import React, { useState, useEffect, useCallback } from 'react';
import Dropdown from './Common/Dropdown';
import { debounce } from 'lodash';

const capitalize = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const CreationScreen = () => {
    // --- STATE MANAGEMENT ---
    const [courses, setCourses] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [incompleteDatapacks, setIncompleteDatapacks] = useState([]);
    const [activeDatapackId, setActiveDatapackId] = useState(null);

    // Form State
    const [formState, setFormState] = useState({
        courseId: '',
        trainerId: '',
        startDate: '',
        duration: 1,
        trainees: []
    });
    const [isSubmittable, setIsSubmittable] = useState(false);
    const [isSaveable, setIsSaveable] = useState(false);

    // --- DATA FETCHING ---
    const fetchIncompleteDatapacks = useCallback(async () => {
        try {
            const datapacks = await window.db.query(`
                SELECT d.id, c.name as courseName, u.forename, u.surname, d.start_date 
                FROM datapack d
                JOIN courses c ON d.course_id = c.id
                JOIN users u ON d.trainer_id = u.id
                WHERE d.status = 'incomplete'
                ORDER BY d.start_date DESC
            `);
            setIncompleteDatapacks(datapacks);
        } catch (error) {
            console.error("Failed to fetch incomplete datapacks:", error);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const [fetchedCourses, fetchedTrainers] = await Promise.all([
                window.db.query('SELECT id, name, course_length FROM courses'),
                window.db.query("SELECT id, forename, surname FROM users WHERE role = 'trainer'"),
            ]);
            setCourses(fetchedCourses);
            setTrainers(fetchedTrainers);
        };
        fetchData();
        fetchIncompleteDatapacks();
    }, [fetchIncompleteDatapacks]);

    // Effect to check if the form is ready for submission/saving
    useEffect(() => {
        const { courseId, trainerId, startDate, trainees } = formState;
        const minFieldsFilled = courseId && trainerId && startDate;
        setIsSaveable(minFieldsFilled);
        setIsSubmittable(minFieldsFilled && trainees.length > 0 && trainees.every(t => t.forename && t.surname));
    }, [formState]);


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
                newTrainees.push({ forename: '', surname: '', sponsor: '', sentry_number: '', has_comments: false, additional_comments: '', sub_sponsor: false });
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
        setActiveDatapackId(null);
    };

    const handleLoadDatapack = async (datapackId) => {
        try {
            const dp = (await window.db.query('SELECT * FROM datapack WHERE id = @param1', [datapackId]))[0];
            if (!dp) return;

            // When loading an incomplete datapack, we need to fetch associated trainees
            const fetchedTrainees = dp.trainee_ids
                ? await window.db.query(`SELECT id, forename, surname, sponsor, sentry_number, additional_comments, sub_sponsor FROM trainees WHERE datapack = @param1`, [datapackId])
                : [];

            setFormState({
                courseId: dp.course_id,
                trainerId: dp.trainer_id,
                startDate: formatDateForInput(dp.start_date),
                duration: dp.duration,
                trainees: fetchedTrainees.map(t => ({ ...t, has_comments: !!t.additional_comments, sub_sponsor: !!t.sub_sponsor }))
            });
            setActiveDatapackId(datapackId);
        } catch (error) {
            console.error("Failed to load datapack:", error);
        }
    };
    
    // --- DATABASE INTERACTIONS ---

    const handleSaveIncomplete = async () => {
        if (!isSaveable) return;
        const { courseId, trainerId, startDate, duration, trainees } = formState;

        try {
            let datapackId = activeDatapackId;

            // Step 1: Insert or get the datapack ID
            if (!datapackId) {
                const result = await window.db.run(
                    'INSERT INTO datapack (course_id, trainer_id, start_date, duration, status) VALUES (@param1, @param2, @param3, @param4, @param5)',
                    [courseId, trainerId, startDate, duration, 'incomplete']
                );
                datapackId = result.lastID;
                setActiveDatapackId(datapackId);
            } else {
                // Update basic datapack info if it's already active
                await window.db.run(
                    'UPDATE datapack SET course_id = @param1, trainer_id = @param2, start_date = @param3, duration = @param4 WHERE id = @param5',
                    [courseId, trainerId, startDate, duration, datapackId]
                );
            }

            // Step 2: Synchronize trainees
            const dbTrainees = await window.db.query('SELECT id FROM trainees WHERE datapack = @param1', [datapackId]);
            const dbTraineeIds = dbTrainees.map(t => t.id);
            const formTraineeIds = trainees.map(t => t.id).filter(Boolean);

            // Trainees to delete
            const traineesToDelete = dbTraineeIds.filter(id => !formTraineeIds.includes(id));
            if (traineesToDelete.length > 0) {
                await window.db.run(`DELETE FROM trainees WHERE id IN (${traineesToDelete.map((_, i) => `@param${i+1}`).join(',')})`, traineesToDelete);
            }

            const allTraineeIds = [];

            for (const trainee of trainees) {
                const forename = capitalize(trainee.forename);
                const surname = capitalize(trainee.surname);

                if (trainee.id) { // Existing trainee -> UPDATE
                    await window.db.run(
                        'UPDATE trainees SET forename = @param1, surname = @param2, sponsor = @param3, sentry_number = @param4, additional_comments = @param5, sub_sponsor = @param6 WHERE id = @param7',
                        [forename, surname, trainee.sponsor, trainee.sentry_number, trainee.additional_comments, trainee.sub_sponsor, trainee.id]
                    );
                    allTraineeIds.push(trainee.id);
                } else { // New trainee -> INSERT
                    const result = await window.db.run(
                        'INSERT INTO trainees (forename, surname, sponsor, sentry_number, additional_comments, datapack, sub_sponsor) VALUES (@param1, @param2, @param3, @param4, @param5, @param6, @param7)',
                        [forename, surname, trainee.sponsor, trainee.sentry_number, trainee.additional_comments, datapackId, trainee.sub_sponsor]
                    );
                    allTraineeIds.push(result.lastID);
                }
            }

            // Step 3: Update the datapack with the final list of trainee IDs and count
            await window.db.run(
                'UPDATE datapack SET trainee_ids = @param1, total_trainee_count = @param2 WHERE id = @param3',
                [allTraineeIds.join(','), allTraineeIds.length, datapackId]
            );

            fetchIncompleteDatapacks();
            // Reload the just-saved datapack to get the fresh trainee data with correct IDs
            handleLoadDatapack(datapackId);

        } catch (error) {
            console.error("Failed to save incomplete datapack:", error);
        }
    };

    const handleDeleteIncomplete = async () => {
        if (!activeDatapackId) return;

        try {
            // First, delete all trainees associated with the datapack
            await window.db.run('DELETE FROM trainees WHERE datapack = @param1', [activeDatapackId]);
            
            // Then, delete the datapack itself
            await window.db.run('DELETE FROM datapack WHERE id = @param1', [activeDatapackId]);

            // Finally, reset the form and refetch the list
            resetForm();
            fetchIncompleteDatapacks();
        } catch (error) {
            console.error("Failed to delete incomplete datapack:", error);
        }
    };

    const handleCreateEvent = async () => {
        if (!isSubmittable) {
            console.error('Validation failed: Please fill out all required fields and add at least one trainee.');
            return;
        }

        const { courseId, trainerId, startDate, duration, trainees } = formState;

        try {
            let datapackId = activeDatapackId;

            // Step 1: Insert or update the datapack
            if (datapackId) {
                await window.db.run(
                    'UPDATE datapack SET course_id = @param1, trainer_id = @param2, start_date = @param3, duration = @param4 WHERE id = @param5',
                    [courseId, trainerId, startDate, duration, datapackId]
                );
            } else {
                const datapackResult = await window.db.run(
                    'INSERT INTO datapack (course_id, trainer_id, start_date, duration, status) VALUES (@param1, @param2, @param3, @param4, @param5)',
                    [courseId, trainerId, startDate, duration, 'pre course']
                );
                datapackId = datapackResult.lastID;
            }

            // Step 2: Synchronize trainees and create user accounts
            const dbTrainees = await window.db.query('SELECT id FROM trainees WHERE datapack = @param1', [datapackId]);
            const dbTraineeIds = dbTrainees.map(t => t.id);
            const formTraineeIds = trainees.map(t => t.id).filter(Boolean);

            const traineesToDelete = dbTraineeIds.filter(id => !formTraineeIds.includes(id));
            if (traineesToDelete.length > 0) {
                await window.db.run(`DELETE FROM trainees WHERE id IN (${traineesToDelete.map((_, i) => `@param${i+1}`).join(',')})`, traineesToDelete);
            }

            const allTraineeIds = [];
            for (const trainee of trainees) {
                const forename = capitalize(trainee.forename);
                const surname = capitalize(trainee.surname);

                if (trainee.id) {
                    await window.db.run(
                        'UPDATE trainees SET forename = @param1, surname = @param2, sponsor = @param3, sentry_number = @param4, additional_comments = @param5, sub_sponsor = @param6 WHERE id = @param7',
                        [forename, surname, trainee.sponsor, trainee.sentry_number, trainee.additional_comments, trainee.sub_sponsor, trainee.id]
                    );
                    allTraineeIds.push(trainee.id);
                } else {
                    const traineeResult = await window.db.run(
                        'INSERT INTO trainees (forename, surname, sponsor, sentry_number, additional_comments, datapack, sub_sponsor) VALUES (@param1, @param2, @param3, @param4, @param5, @param6, @param7)',
                        [forename, surname, trainee.sponsor, trainee.sentry_number, trainee.additional_comments, datapackId, trainee.sub_sponsor]
                    );
                    const newTraineeId = traineeResult.lastID;
                    allTraineeIds.push(newTraineeId);

                    let username = `${forename.toLowerCase()}.${surname.toLowerCase()}`;
                    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
                    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    const password = `${forename.charAt(0).toUpperCase() + forename.slice(1)}${Math.floor(1000 + Math.random() * 9000)}${randomSymbol}`;
                    
                    let userCreated = false;
                    let attempt = 0;
                    while (!userCreated) {
                        try {
                            await window.db.run(
                                'INSERT INTO users (forename, surname, role, username, password) VALUES (@param1, @param2, @param3, @param4, @param5)',
                                [forename, surname, 'candidate', username, password]
                            );
                            userCreated = true;
                        } catch (userError) {
                            if (userError.message.includes('SQLITE_CONSTRAINT') && userError.message.includes('users.username')) {
                                attempt++;
                                username = `${forename.toLowerCase()}.${surname.toLowerCase()}${attempt}`;
                            } else {
                                console.error(`Failed to create user for ${forename} ${surname} due to an unexpected error:`, userError);
                                break;
                            }
                        }
                    }
                }
            }

            // Step 3: Finalize datapack
            await window.db.run(
                'UPDATE datapack SET trainee_ids = @param1, total_trainee_count = @param2, status = @param3 WHERE id = @param4',
                [allTraineeIds.join(','), allTraineeIds.length, 'pre course', datapackId]
            );

            resetForm();
            fetchIncompleteDatapacks();
        } catch (error) {
            console.error('Failed to create or update event:', error);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'Invalid Date';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB').format(date);
    };

    const formatIncompleteTitle = (dp) => {
        if (!dp || !dp.start_date || !dp.courseName || !dp.forename || !dp.surname) return "Invalid Datapack";
        
        const date = new Date(dp.start_date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        
        const initial = dp.forename.charAt(0).toUpperCase();
        
        return `${day}.${month}.${year} ${dp.courseName} ${initial} ${dp.surname}`;
    };

    const getPageTitle = () => {
        if (!activeDatapackId) {
            return 'New Registration Form';
        }

        const course = courses.find(c => c.id === formState.courseId);
        const trainer = trainers.find(t => t.id === formState.trainerId);

        if (course && trainer && formState.startDate) {
            const dp = {
                start_date: formState.startDate,
                courseName: course.name,
                forename: trainer.forename,
                surname: trainer.surname
            };
            return `Editing ${formatIncompleteTitle(dp)}`;
        }

        return `Editing Register #${activeDatapackId}`; // Fallback
    };

    const renderRegistrationForm = () => (
        <div className="p-8 h-full overflow-y-auto relative">
             <button onClick={resetForm} className="absolute top-4 right-4 text-2xl font-bold text-gray-500 hover:text-gray-800">&times;</button>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {getPageTitle()}
            </h2>
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
                                <div className="mt-2 flex items-center gap-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`other-checkbox-${index}`}
                                            checked={trainee.has_comments}
                                            onChange={e => handleTraineeChange(index, 'has_comments', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor={`other-checkbox-${index}`} className="ml-2 text-sm text-gray-900">Other</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`sub-sponsor-checkbox-${index}`}
                                            checked={trainee.sub_sponsor}
                                            onChange={e => handleTraineeChange(index, 'sub_sponsor', e.target.checked)}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor={`sub-sponsor-checkbox-${index}`} className="ml-2 text-sm text-gray-900">Sub Sponsor</label>
                                    </div>
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
            
            {/* Action Buttons */}
            <div className="mt-8 flex justify-end gap-4">
                 <button
                    onClick={handleSaveIncomplete}
                    className={`px-6 py-2 bg-yellow-500 text-white font-semibold rounded-md ${!isSaveable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600'}`}
                    disabled={!isSaveable}
                >
                    {activeDatapackId ? 'Update Incomplete' : 'Save Incomplete'}
                </button>
                {activeDatapackId && (
                    <button
                        onClick={handleDeleteIncomplete}
                        className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
                    >
                        Delete
                    </button>
                )}
                <button 
                    onClick={handleCreateEvent} 
                    className={`px-6 py-2 bg-blue-600 text-white font-semibold rounded-md ${!isSubmittable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                    disabled={!isSubmittable}
                >
                    {activeDatapackId ? 'Update & Finalize Event' : 'Create New Event'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Column */}
            <div className="w-1/5 bg-white p-6 shadow-md flex flex-col">
                <h2 className="text-xl font-bold mb-6">Create</h2>
                <button
                    onClick={resetForm}
                    className="w-full text-left p-3 mb-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    New Register
                </button>
                <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-2">Incomplete Registers</h3>
                    <div className="space-y-2">
                        {incompleteDatapacks.map(dp => (
                            <button
                                key={dp.id}
                                onClick={() => handleLoadDatapack(dp.id)}
                                className={`w-full text-left p-2 rounded-md ${activeDatapackId === dp.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 hover:bg-gray-200'}`}
                            >
                                <div className="font-bold">{formatIncompleteTitle(dp)}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column (Canvas) */}
            <div className="w-4/5 bg-white">
                {renderRegistrationForm()}
            </div>
        </div>
    );
};

export default CreationScreen; 