import React, { useState } from 'react';

const LoginScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const users = await window.db.query(
                'SELECT * FROM users WHERE username = @param1 AND password = @param2',
                [username, password]
            );

            if (users.length > 0) {
                const user = users[0];

                // Fire and forget the initialization process. We don't need to wait for it.
                window.electron.initializeUserSession(user);

                // Pass the entire user object on successful login
                onLogin({
                    id: user.id,
                    forename: user.forename,
                    surname: user.surname,
                    role: user.role
                });
            } else {
                setError('Invalid username or password.');
            }
        } catch (err) {
            console.error('Login failed:', err);
            setError('An error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
        setError('');
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        setError('');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center">Login</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label
                            htmlFor="username"
                            className="text-sm font-bold text-gray-600"
                        >
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={handleUsernameChange}
                            className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="text-sm font-bold text-gray-600"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={handlePasswordChange}
                            className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-gray-400"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <button
                        onClick={() => window.electron.quitApp()}
                        className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Exit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen; 