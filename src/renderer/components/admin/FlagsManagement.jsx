import React, { useState, useEffect } from 'react';

const FlagsManagement = ({ user }) => {
    const [flags, setFlags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFlags = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // This query joins the flags table with the users table twice 
                // to get the names of both the user who raised the flag and who it was sent to.
                let query = `
                    SELECT 
                        f.*, 
                        raiser.forename || ' ' || raiser.surname AS raised_by,
                        receiver.forename || ' ' || receiver.surname AS sent_to
                    FROM flags f
                    JOIN users raiser ON f.user_id = raiser.id
                    JOIN users receiver ON f.user_sent_to_id = receiver.id
                `;

                // Filter flags based on the current user's role.
                if (user.role === 'admin') {
                    // Admins only see flags sent to other admins.
                    query += ` WHERE receiver.role = 'admin'`;
                } else if (user.role !== 'dev') {
                    // If the user is not a dev or an admin, show no flags.
                    // This is a safeguard, as routing should prevent this.
                    setFlags([]);
                    setIsLoading(false);
                    return;
                }
                // Devs see all flags, so no WHERE clause is added for them.

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

    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-GB');

    if (isLoading) {
        return <div className="p-6">Loading flags...</div>;
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Flags</h2>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Raised By</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sent To</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Page</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                            <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {flags.map((flag) => (
                            <tr key={flag.id}>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.title}</td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.raised_by}</td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.sent_to}</td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{flag.page}</td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span className={`relative inline-block px-3 py-1 font-semibold leading-tight ${
                                        flag.status === 'open' ? 'text-red-900' : 'text-green-900'
                                    }`}>
                                        <span aria-hidden className={`absolute inset-0 ${
                                            flag.status === 'open' ? 'bg-red-200' : 'bg-green-200'
                                        } opacity-50 rounded-full`}></span>
                                        <span className="relative">{flag.status}</span>
                                    </span>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">{formatDate(flag.created_at)}</td>
                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                                    <button className="text-indigo-600 hover:text-indigo-900">
                                        View
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

export default FlagsManagement; 