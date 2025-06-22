import React, { useState, useEffect } from 'react';
import Register from './Components/Register';
import Dashboard from './Components/Dashboard';
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(userData);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isAuthenticated) {
    return (
      <div className="app">
        <nav className="navbar">
          <div className="nav-content">
            <h2>SmartExpiry</h2>
            <div className="nav-user">
              <span>Welcome, {user?.name}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>
        </nav>
        <Dashboard />
      </div>
    );
  }

  return <Register />;
};

export default App;