import React, { useState, useEffect } from 'react';
import Dropdown from './common/Dropdown';

const CourseScreen = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setCourses(await window.db.query('SELECT * FROM courses'));
        };
        fetchData();
    }, []);
    
    const courseIsSelected = selectedCourse;

    return (
        <div className="flex h-full bg-gray-100">
            {/* Left Column */}
            <div className="w-1/5 bg-white p-6 shadow-md">
                <h2 className="text-xl font-bold mb-6">Course</h2>
                <Dropdown
                    label="Course"
                    value={selectedCourse}
                    onChange={setSelectedCourse}
                    options={courses}
                />
            </div>

            {/* Right Column */}
            <div className="w-4/5 p-10">
                <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg shadow-md">
                    {courseIsSelected ? (
                        <div>
                            <p className="text-2xl text-gray-700">Questionnaires for the selected course appear here</p>
                        </div>
                    ) : (
                        <p className="text-gray-500">Please select a course to view questionnaires.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseScreen;
