import React, { useState, useEffect } from 'react';
import './notifications.css';

const NotificationSettings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    enabled: true,
    daysBeforeExpiry: 3,
    emailNotifications: false,
    soundEnabled: true,
    desktopNotifications: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.notificationSettings);
      } else {
        const errorData = await response.json();
        if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationSettings: settings })
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN') {
          setMessage('Session expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setMessage(data.message || 'Failed to save settings');
        }
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
    
    setLoading(false);
  };

  const handleToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleDaysChange = (value) => {
    setSettings(prev => ({
      ...prev,
      daysBeforeExpiry: parseInt(value)
    }));
  };

  return (
    <div className="notifications-overlay" onClick={onClose}>
      <div className="notifications-panel settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <h3>Notification Settings</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="settings-content">
          <div className="setting-group">
            <h4>General Notifications</h4>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Enable Notifications</label>
                <p>Receive alerts for expiring items</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={() => handleToggle('enabled')}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Days Before Expiry</label>
                <p>How many days before expiry to send notifications</p>
              </div>
              <select
                value={settings.daysBeforeExpiry}
                onChange={(e) => handleDaysChange(e.target.value)}
                disabled={!settings.enabled}
              >
                <option value={1}>1 day</option>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={5}>5 days</option>
                <option value={7}>1 week</option>
              </select>
            </div>
          </div>

          <div className="setting-group">
            <h4>Notification Methods</h4>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Sound Alerts</label>
                <p>Play sound when new notifications arrive</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() => handleToggle('soundEnabled')}
                  disabled={!settings.enabled}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Desktop Notifications</label>
                <p>Show browser notifications (requires permission)</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.desktopNotifications}
                  onChange={() => handleToggle('desktopNotifications')}
                  disabled={!settings.enabled}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label>Email Notifications</label>
                <p>Send notifications via email (coming soon)</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                  disabled={!settings.enabled}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <h4>Quick Actions</h4>
            <div className="quick-actions">
              <button 
                className="action-btn"
                onClick={() => {
                  // Test notification sound
                  if (settings.soundEnabled) {
                    const audio = new Audio('/notification-sound.mp3');
                    audio.play().catch(() => {
                      // Fallback to browser notification
                      if (Notification.permission === 'granted') {
                        new Notification('SmartExpiry', {
                          body: 'Test notification sound',
                          icon: '/favicon.ico'
                        });
                      }
                    });
                  }
                }}
              >
                🔊 Test Sound
              </button>
              
              <button 
                className="action-btn"
                onClick={() => {
                  if (Notification.permission === 'granted') {
                    new Notification('SmartExpiry', {
                      body: 'Test desktop notification',
                      icon: '/favicon.ico'
                    });
                  } else if (Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                }}
              >
                📱 Test Desktop Notification
              </button>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button 
            className="save-settings-btn"
            onClick={saveSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings; 