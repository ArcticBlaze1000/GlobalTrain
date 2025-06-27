import React, { useState, useEffect, useMemo } from 'react';

const SortableHeader = ({ children, sortKey, currentSort, onSort }) => {
    const isSorted = currentSort.key === sortKey;
    const isAsc = isSorted && currentSort.direction === 'asc';
    const isDesc = isSorted && currentSort.direction === 'desc';

    return (
        <th className="px-4 py-2 cursor-pointer" onClick={() => onSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <span className="ml-2">
                    {isAsc && '▲'}
                    {isDesc && '▼'}
                    {!isSorted && '↕'}
                </span>
            </div>
        </th>
    );
};

const UsersScreen = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [forename, setForename] = useState('');
    const [surname, setSurname] = useState('');
    const [role, setRole] = useState('trainer'); // Default role for new user
    const [sort, setSort] = useState({ key: 'id', direction: 'asc' });

    const fetchUsers = async () => {
        const allUsers = await window.db.query('SELECT id, forename, surname, role, username FROM users');
        setUsers(allUsers);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...users];
        if (sort.key) {
            sortableUsers.sort((a, b) => {
                const direction = sort.direction === 'asc' ? 1 : -1;

                if (sort.key === 'role') {
                    const roleOrder = { dev: 3, admin: 2, trainer: 1 };
                    const aVal = roleOrder[a.role] || 0;
                    const bVal = roleOrder[b.role] || 0;
                    return (aVal - bVal) * direction;
                }

                // For other keys (id, forename, surname)
                const aVal = a[sort.key];
                const bVal = b[sort.key];

                if (aVal < bVal) {
                    return -1 * direction;
                }
                if (aVal > bVal) {
                    return 1 * direction;
                }
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sort]);

    const handleSort = (key) => {
        setSort(prevSort => {
            const isSameKey = prevSort.key === key;
            const direction = isSameKey && prevSort.direction === 'asc' ? 'desc' : 'asc';
            return { key, direction };
        });
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!forename || !surname) {
            alert('Please enter a forename and surname.');
            return;
        }

        // Admins can only add trainers
        if (currentUser.role === 'admin' && role !== 'trainer') {
            alert('Admins can only add users with the role of Trainer.');
            return;
        }

        const username = forename.toLowerCase();
        const password = surname.toLowerCase();

        try {
            await window.db.query(
                'INSERT INTO users (forename, surname, role, username, password) VALUES (?, ?, ?, ?, ?)',
                [forename, surname, role, username, password]
            );
            // Reset form and refetch users
            setForename('');
            setSurname('');
            setRole('trainer');
            fetchUsers();
        } catch (error) {
            console.error('Failed to add user:', error);
            alert(`Failed to add user. They may already exist. Error: ${error.message}`);
        }
    };

    const handleDeleteUser = async (userToDelete) => {
        if (currentUser.id === userToDelete.id) {
            alert("You cannot delete your own account.");
            return;
        }
        
        // Admins can only delete trainers
        if (currentUser.role === 'admin' && userToDelete.role !== 'trainer') {
            alert('Admins can only delete users with the role of Trainer.');
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${userToDelete.forename} ${userToDelete.surname}?`)) {
            try {
                await window.db.query('DELETE FROM users WHERE id = ?', [userToDelete.id]);
                fetchUsers();
            } catch (error) {
                console.error('Failed to delete user:', error);
                alert(`Failed to delete user. Error: ${error.message}`);
            }
        }
    };

    return (
        <div className="flex h-full bg-gray-100 p-8 space-x-8">
            {/* User List Table */}
            <div className="w-2/3 bg-white p-6 rounded-lg shadow-md overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">User Management</h2>
                <table className="w-full text-left table-auto">
                    <thead className="bg-gray-200">
                        <tr>
                            <SortableHeader sortKey="id" currentSort={sort} onSort={handleSort}>ID</SortableHeader>
                            <SortableHeader sortKey="forename" currentSort={sort} onSort={handleSort}>Forename</SortableHeader>
                            <SortableHeader sortKey="surname" currentSort={sort} onSort={handleSort}>Surname</SortableHeader>
                            <SortableHeader sortKey="role" currentSort={sort} onSort={handleSort}>Role</SortableHeader>
                            <th className="px-4 py-2">Username</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2">{user.id}</td>
                                <td className="px-4 py-2">{user.forename}</td>
                                <td className="px-4 py-2">{user.surname}</td>
                                <td className="px-4 py-2 capitalize">{user.role}</td>
                                <td className="px-4 py-2">{user.username}</td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => handleDeleteUser(user)}
                                        className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                        disabled={(currentUser.role === 'admin' && user.role !== 'trainer') || currentUser.id === user.id}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Form */}
            <div className="w-1/3 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">Add New User</h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Forename</label>
                        <input
                            type="text"
                            value={forename}
                            onChange={(e) => setForename(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Surname</label>
                        <input
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md"
                        >
                            {currentUser.role === 'dev' && <option value="dev">Dev</option>}
                            {currentUser.role === 'dev' && <option value="admin">Admin</option>}
                            <option value="trainer">Trainer</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Add User
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UsersScreen;
