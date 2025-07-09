import React, { useState, useEffect } from 'react';

const RegisterTable = ({ title, registers, onRegisterSelect }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB').format(date);
    };

    return (
        <div className="mb-8">
            <div 
                className="flex items-center cursor-pointer mb-4"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <svg className={`w-5 h-5 text-gray-600 transform transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                <h2 className="text-2xl font-bold text-gray-800 ml-2">{title}</h2>
            </div>

            {!isCollapsed && (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {registers.length > 0 ? registers.map((reg) => (
                                <tr key={reg.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${reg.trainerForename} ${reg.trainerSurname}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(reg.start_date)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        0% {/* Placeholder for completion */}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-4 text-gray-500">No registers in this category.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const RegistersManagement = () => {
    const [registers, setRegisters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRegisters = async () => {
            setLoading(true);
            try {
                const fetchedRegisters = await window.db.query(`
                    SELECT 
                        d.id, 
                        d.status,
                        d.start_date,
                        c.name as courseName,
                        u.forename as trainerForename,
                        u.surname as trainerSurname
                    FROM datapack d
                    JOIN courses c ON d.course_id = c.id
                    JOIN users u ON d.trainer_id = u.id
                    WHERE d.status IN ('pre course', 'post course')
                    ORDER BY d.start_date DESC
                `);
                setRegisters(fetchedRegisters);
            } catch (error) {
                console.error("Failed to fetch registers:", error);
            }
            setLoading(false);
        };

        fetchRegisters();
    }, []);
    
    const preCourseRegisters = registers.filter(r => r.status === 'pre course');
    const postCourseRegisters = registers.filter(r => r.status === 'post course');

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Registers</h1>
            
            {loading ? (
                <p>Loading registers...</p>
            ) : (
                <>
                    <RegisterTable title="Pre Course" registers={preCourseRegisters} />
                    <RegisterTable title="Post Course" registers={postCourseRegisters} />
                </>
            )}
        </div>
    );
};

export default RegistersManagement; 