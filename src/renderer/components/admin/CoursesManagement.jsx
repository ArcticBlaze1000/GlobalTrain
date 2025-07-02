import React, { useState, useEffect } from 'react';

// Modal for adding/editing courses
const CourseModal = ({ course, documents, competencies, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: course?.name || '',
        course_length: course?.course_length || 1,
        doc_ids: course?.doc_ids ? course.doc_ids.split(',').filter(Boolean).map(Number) : [],
        competency_ids: course?.competency_ids ? course.competency_ids.split(',').filter(Boolean).map(Number) : [],
        non_mandatory_doc_ids: course?.non_mandatory_doc_ids ? course.non_mandatory_doc_ids.split(',').filter(Boolean).map(Number) : [],
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleItem = (field, id) => {
        setFormData(prev => {
            const currentIds = prev[field];
            const newIds = currentIds.includes(id)
                ? currentIds.filter(itemId => itemId !== id)
                : [...currentIds, id];

            // If a document is deselected, also remove it from non-mandatory list
            if (field === 'doc_ids' && !newIds.includes(id)) {
                const newNonMandatoryIds = prev.non_mandatory_doc_ids.filter(nmId => nmId !== id);
                return { ...prev, [field]: newIds, non_mandatory_doc_ids: newNonMandatoryIds };
            }

            return { ...prev, [field]: newIds };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalData = {
            ...formData,
            doc_ids: formData.doc_ids.join(','),
            competency_ids: formData.competency_ids.join(','),
            non_mandatory_doc_ids: formData.non_mandatory_doc_ids.join(','),
        };
        if (course) {
            finalData.id = course.id;
        }
        onSave(finalData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{course ? 'Edit Course' : 'Add New Course'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Course Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded-md"
                            required
                        />
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Course Length (days)</label>
                        <input
                            type="number"
                            name="course_length"
                            value={formData.course_length}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded-md"
                            required
                            min="1"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Documents</label>
                            <div className="w-full p-2 border rounded-md h-48 overflow-y-auto">
                                {documents.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => handleToggleItem('doc_ids', doc.id)}
                                        className={`p-2 cursor-pointer rounded-md text-sm ${formData.doc_ids.includes(doc.id) ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        {doc.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Competencies</label>
                             <div className="w-full p-2 border rounded-md h-48 overflow-y-auto">
                                {competencies.map(comp => (
                                    <div
                                        key={comp.id}
                                        onClick={() => handleToggleItem('competency_ids', comp.id)}
                                        className={`p-2 cursor-pointer rounded-md text-sm ${formData.competency_ids.includes(comp.id) ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        {comp.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                     <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2">Non-Mandatory Documents</label>
                        <p className="text-xs text-gray-500 mb-2">Select from the documents you chose above. Click to mark as non-mandatory.</p>
                         <div className="w-full p-2 border rounded-md h-32 overflow-y-auto">
                            {documents
                                .filter(doc => formData.doc_ids.includes(doc.id))
                                .map(doc => (
                                     <div
                                        key={doc.id}
                                        onClick={() => handleToggleItem('non_mandatory_doc_ids', doc.id)}
                                        className={`p-2 cursor-pointer rounded-md text-sm ${formData.non_mandatory_doc_ids.includes(doc.id) ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
                                    >
                                        {doc.name}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onCancel} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Course</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CoursesManagement = ({ user }) => {
    const [courses, setCourses] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [coursesData, documentsData, competenciesData] = await Promise.all([
                window.electron.getCourses(),
                window.electron.getDocuments(),
                window.electron.getCompetencies(),
            ]);
            setCourses(coursesData);
            setDocuments(documentsData);
            setCompetencies(competenciesData);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch course data:", err);
            setError("Failed to load data. Please try refreshing the application.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (course = null) => {
        setEditingCourse(course);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCourse(null);
        setIsModalOpen(false);
    };

    const handleSaveCourse = async (courseData) => {
        try {
            if (editingCourse) {
                await window.electron.updateCourse(courseData);
            } else {
                await window.electron.addCourse(courseData);
            }
            fetchData(); // Refresh data from DB
            handleCloseModal();
        } catch (err) {
            alert(`Failed to save course: ${err.message}`);
        }
    };

    const getNameById = (id, list) => list.find(item => item.id === id)?.name || 'Unknown';

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            try {
                await window.electron.deleteCourse(courseId);
                setCourses(courses.filter(c => c.id !== courseId));
            } catch (err) {
                alert(`Failed to delete course: ${err.message}`);
            }
        }
    };

    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    if (error) {
        return <div className="p-6 text-red-500">{error}</div>;
    }

    return (
        <div className="flex-grow p-6 bg-gray-50">
            {isModalOpen && (
                <CourseModal
                    course={editingCourse}
                    documents={documents}
                    competencies={competencies}
                    onSave={handleSaveCourse}
                    onCancel={handleCloseModal}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Courses Management</h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Add New Course
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600">Course Name</th>
                             <th className="p-3 text-left text-sm font-semibold text-gray-600">Length</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600">Documents</th>
                             <th className="p-3 text-left text-sm font-semibold text-gray-600">Non-Mandatory</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600">Competencies</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(course => (
                            <tr key={course.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{course.name}</td>
                                <td className="p-3 text-sm">{course.course_length}d</td>
                                <td className="p-3 text-sm text-gray-700">
                                     <ul className="list-disc list-inside">
                                        {(course.doc_ids || '').split(',').filter(id => id).map(id => (
                                            <li key={id}>{getNameById(parseInt(id), documents)}</li>
                                        ))}
                                    </ul>
                                </td>
                                 <td className="p-3 text-sm text-gray-500">
                                    <ul className="list-disc list-inside">
                                        {(course.non_mandatory_doc_ids || '').split(',').filter(id => id).map(id => (
                                            <li key={id}>{getNameById(parseInt(id), documents)}</li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="p-3 text-sm text-gray-700">
                                    <ul className="list-disc list-inside">
                                        {(course.competency_ids || '').split(',').filter(id => id).map(id => (
                                            <li key={id}>{getNameById(parseInt(id), competencies)}</li>
                                        ))}
                                    </ul>
                                </td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => handleOpenModal(course)}
                                        className="text-blue-600 hover:underline text-sm mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCourse(course.id)}
                                        className="text-red-600 hover:underline text-sm"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CoursesManagement; 