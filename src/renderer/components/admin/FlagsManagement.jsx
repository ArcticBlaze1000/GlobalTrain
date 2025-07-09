import React, { useState, useEffect } from 'react';
import FlagDetailView from './FlagDetailView';

const statusStyles = {
    open: { text: 'text-red-900', bg: 'bg-red-200' },
    'in-progress': { text: 'text-yellow-900', bg: 'bg-yellow-200' },
    resolved: { text: 'text-green-900', bg: 'bg-green-200' },
    rejected: { text: 'text-gray-900', bg: 'bg-gray-200' },
};

const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('en-GB') : 'N/A';

// Reusable table component for displaying a list of flags
const FlagTable = ({ title, flags, onFlagSelect, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center justify-center p-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <svg className={`w-5 h-5 text-gray-600 transform transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                </div>
                {children}
            </div>
            {!isCollapsed && (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Raised By</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sent To</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {flags.length > 0 ? flags.map((flag) => (
                                <tr key={flag.id}>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.title}</td>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.raised_by}</td>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.sent_to}</td>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                        <span className={`relative inline-block px-3 py-1 font-semibold leading-tight ${statusStyles[flag.status]?.text || ''}`}>
                                            <span aria-hidden className={`absolute inset-0 ${statusStyles[flag.status]?.bg || ''} opacity-50 rounded-full`}></span>
                                            <span className="relative">{flag.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{formatDate(flag.created_at)}</td>
                                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                                        <button onClick={() => onFlagSelect(flag)} className="text-indigo-600 hover:text-indigo-900">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="text-center p-5 text-gray-500">No flags in this category.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const FlagsManagement = ({ user }) => {
    const [flags, setFlags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFlag, setSelectedFlag] = useState(null);
    const [filterMode, setFilterMode] = useState('1d'); // '1d', '1w', '1m', 'custom'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchFlags = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                let query = `
                    SELECT 
                        f.*, 
                        raiser.forename || ' ' || raiser.surname AS raised_by,
                        receiver.forename || ' ' || receiver.surname AS sent_to
                    FROM flags f
                    JOIN users raiser ON f.user_id = raiser.id
                    JOIN users receiver ON f.user_sent_to_id = receiver.id
                `;
                if (user.role === 'admin') {
                    query += ` WHERE receiver.role = 'admin'`;
                } else if (user.role !== 'dev') {
                    setFlags([]);
                    setIsLoading(false);
                    return;
                }
                query += ' ORDER BY f.created_at DESC';
                const result = await window.db.query(query);
                setFlags(result);
            } catch (error) {
                console.error("Failed to fetch flags:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFlags();
    }, [user]);

    const handleFlagUpdate = (updatedFlag) => {
        setFlags(currentFlags => 
            currentFlags.map(f => f.id === updatedFlag.id ? updatedFlag : f)
        );
        setSelectedFlag(updatedFlag);
    };

    if (isLoading) {
        return <div className="p-6">Loading flags...</div>;
    }

    if (selectedFlag) {
        return <FlagDetailView flag={selectedFlag} user={user} onBackToList={() => setSelectedFlag(null)} onUpdate={handleFlagUpdate} />;
    }

    const getFilteredFlags = (status) => {
        const statusMap = {
            open: ['open'],
            'in-progress': ['in-progress'],
            closed: ['resolved', 'rejected'],
        };
        const targetStatuses = statusMap[status] || [];
        let filtered = flags.filter(f => targetStatuses.includes(f.status));

        if (status === 'closed') {
            let start;
            let end;

            if (filterMode === 'custom') {
                start = startDate ? new Date(startDate) : null;
                if(start) start.setHours(0, 0, 0, 0);
                end = endDate ? new Date(endDate) : null;
                if(end) end.setHours(23, 59, 59, 999);
            } else {
                const now = new Date();
                end = new Date(); // Today
                end.setHours(23, 59, 59, 999);
                start = new Date();
                start.setHours(0, 0, 0, 0);

                const timeLimits = {
                    '1d': 1,
                    '1w': 7,
                    '1m': 30,
                };
                start.setDate(now.getDate() - (timeLimits[filterMode] || 0));
            }
            
            if (start || end) {
                filtered = filtered.filter(f => {
                    if (!f.resolved_at) return false;
                    const resolvedDate = new Date(f.resolved_at);
                    if (start && end) return resolvedDate >= start && resolvedDate <= end;
                    if (start) return resolvedDate >= start;
                    if (end) return resolvedDate <= end;
                    return true;
                });
            }
        }
        return filtered;
    };
    
    const FilterButton = ({ period, label }) => (
        <button
            onClick={() => setFilterMode(period)}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
                filterMode === period ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-6">
            <FlagTable title="Open" flags={getFilteredFlags('open')} onFlagSelect={setSelectedFlag} />
            <FlagTable title="In Progress" flags={getFilteredFlags('in-progress')} onFlagSelect={setSelectedFlag} />
            <FlagTable title="Closed" flags={getFilteredFlags('closed')} onFlagSelect={setSelectedFlag}>
                <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-2">
                        <FilterButton period="1d" label="1 Day" />
                        <FilterButton period="1w" label="1 Week" />
                        <FilterButton period="1m" label="1 Month" />
                        <FilterButton period="custom" label="Custom" />
                    </div>
                    {filterMode === 'custom' && (
                        <div className="flex items-center space-x-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <label htmlFor="start-date" className="text-sm font-medium text-gray-700">From</label>
                                <input 
                                    type="date" 
                                    id="start-date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="end-date" className="text-sm font-medium text-gray-700">To</label>
                                <input 
                                    type="date" 
                                    id="end-date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="px-3 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </FlagTable>
        </div>
    );
};

export default FlagsManagement; 