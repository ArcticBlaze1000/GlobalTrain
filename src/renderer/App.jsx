import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

function App() {
  const [userRole, setUserRole] = useState(null);

  const handleLoginSuccess = (role) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  return (
    <div>
      {userRole ? <Dashboard userRole={userRole} onLogout={handleLogout} /> : <LoginScreen onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 