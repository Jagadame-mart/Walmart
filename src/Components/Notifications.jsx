import React, { useState, useEffect } from 'react';
import './notifications.css';

const Notifications = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    checkExpiringItems();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const checkExpiringItems = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/check-expiring-items', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh notifications after checking
      fetchNotifications();
    } catch (error) {
      console.error('Error checking expiring items:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    return type === 'expired' ? '⚠️' : '🔔';
  };

  const getNotificationClass = (type, read) => {
    let baseClass = 'notification-item';
    if (!read) baseClass += ' unread';
    if (type === 'expired') baseClass += ' expired';
    return baseClass;
  };

  return (
    <div className="notifications-overlay" onClick={onClose}>
      <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <h3>Notifications</h3>
          <div className="notifications-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                disabled={loading}
              >
                {loading ? 'Marking...' : 'Mark All Read'}
              </button>
            )}
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="notifications-content">
          {notifications.length === 0 ? (
            <div className="no-notifications">
              <p>No notifications yet</p>
              <small>You'll get alerts when items are expiring soon</small>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={getNotificationClass(notification.type, notification.read)}
                onClick={() => !notification.read && markAsRead(notification._id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <p className="notification-message">{notification.message}</p>
                  <p className="notification-item-name">
                    Item: {notification.itemId?.name || 'Unknown Item'}
                  </p>
                  <p className="notification-date">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && <div className="unread-indicator"></div>}
              </div>
            ))
          )}
        </div>

        {unreadCount > 0 && (
          <div className="notifications-footer">
            <span>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications; 