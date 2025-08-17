import React, { useState, useEffect, useMemo } from 'react';
import PreCourseChecklist from './PreCourseChecklist';

const PRE_COURSE_DOC_IDS = [27, 28, 29, 30];

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
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {registers.length > 0 ? registers.map((reg) => (
                                <tr key={reg.id} onClick={() => onRegisterSelect(reg)} className="hover:bg-gray-100 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">{reg.courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${reg.trainerForename} ${reg.trainerSurname}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(reg.start_date)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-gray-500">No registers in this category.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const RegistersManagement = ({ user, openSignatureModal }) => {
    const [registers, setRegisters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRegister, setSelectedRegister] = useState(null);

    const fetchRegisters = async () => {
        setLoading(true);
        try {
            const fetchedRegisters = await window.db.query(`
                SELECT 
                    d.*, 
                    c.name as courseName,
                    c.doc_ids as courseDocIds,
                    u.forename as trainerForename,
                    u.surname as trainerSurname
                FROM datapack d
                JOIN courses c ON d.course_id = c.id
                JOIN users u ON d.trainer_id = u.id
                WHERE d.status IN ('pre course', 'post course')
                ORDER BY d.start_date DESC
            `);
            
            const registersWithCompletion = await Promise.all(fetchedRegisters.map(async (reg) => {
                const courseDocIds = reg.courseDocIds ? reg.courseDocIds.split(',').map(Number) : [];
                // Find the intersection of pre-course docs and the docs for this specific course
                const applicableDocIds = PRE_COURSE_DOC_IDS.filter(id => courseDocIds.includes(id));

                let completion = 0;
                if (applicableDocIds.length > 0) {
                    const progressResult = await window.db.get(
                        `SELECT AVG(dp.completion_percentage) as avg_completion
                         FROM document_progress dp 
                         WHERE dp.datapack_id = @param1 AND dp.document_id IN (${applicableDocIds.map((_, i) => `@param${i+2}`).join(',')}) AND dp.trainee_id IS NULL`,
                        [reg.id, ...applicableDocIds]
                    );
                    completion = progressResult.avg_completion || 0;
                }
                
                // Attach the applicable IDs to the register object for the checklist to use
                return { ...reg, completion, applicableDocIds };
            }));

            setRegisters(registersWithCompletion);
        } catch (error) {
            console.error("Failed to fetch registers:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRegisters();
    }, []);

    const handleSelectRegister = (register) => {
        if (register.status === 'pre course') {
            setSelectedRegister(register);
        } else {
            alert("This functionality is only for 'Pre Course' registers at the moment.");
        }
    };
    
    const handleBackToList = () => {
        setSelectedRegister(null);
        fetchRegisters(); // Refetch to get the latest statuses and progress
    };

    const preCourseRegisters = useMemo(() => 
        registers.filter(r => r.status === 'pre course'),
    [registers]);

    const postCourseRegisters = useMemo(() =>
        registers.filter(r => r.status === 'post course'),
    [registers]);

    if (loading) {
        return <div className="p-6 text-center">Loading registers...</div>;
    }

    if (selectedRegister) {
        return (
            <PreCourseChecklist 
                register={selectedRegister} 
                user={user}
                onBackToList={handleBackToList}
            />
        );
    }
    
    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Registers</h1>
            <RegisterTable 
                title="Pre Course" 
                registers={preCourseRegisters} 
                onRegisterSelect={handleSelectRegister} 
            />
            <RegisterTable 
                title="Post Course" 
                registers={postCourseRegisters} 
                onRegisterSelect={handleSelectRegister}
            />
        </div>
    );
};

export default RegistersManagement; 