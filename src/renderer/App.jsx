import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { EventProvider } from './context/EventContext';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="bg-gray-100 h-screen">
      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <EventProvider>
          <Dashboard user={user} onLogout={handleLogout} />
        </EventProvider>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 