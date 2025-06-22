import React, { useState, useEffect } from 'react';
import Notifications from './Notifications';
import NotificationSettings from './NotificationSettings';
import Analytics from './Analytics';
import './dashboard.css';

const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Other', expiryDate: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [categories, setCategories] = useState([]);
  
  // Background job states
  const [backgroundJobStatus, setBackgroundJobStatus] = useState('idle');
  const [lastUpdate, setLastUpdate] = useState(null);

  // Real-time notification polling
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    if (token) {
      fetchItems();
      fetchNotificationCount();
      fetchCategories();
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Set up real-time notification polling (every 30 seconds)
      const notificationInterval = setInterval(() => {
        fetchNotificationCount();
      }, 30000);
      
      return () => clearInterval(notificationInterval);
    }
  }, [searchTerm, selectedCategory, selectedStatus]);

  // Utility function to handle API calls with token validation
  const apiCall = async (url, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Making API call to:', url);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        
        if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
          setMessage('Session expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
          return null;
        }
        throw new Error(errorData.message || 'API call failed');
      }

      const data = await response.json();
      console.log('Success response:', data);
      return data;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const data = await apiCall(`http://localhost:5000/api/items?${params}`);
      if (data) setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiCall('http://localhost:5000/api/categories');
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const data = await apiCall('http://localhost:5000/api/notifications');
      if (data) setUnreadNotifications(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const triggerBackgroundJobs = async () => {
    setBackgroundJobStatus('running');
    setMessage('Running background jobs...');
    
    try {
      const data = await apiCall('http://localhost:5000/api/trigger-background-jobs', {
        method: 'POST'
      });
      
      if (data) {
        setMessage('Background jobs completed successfully!');
        setLastUpdate(new Date().toLocaleTimeString());
        // Refresh data
        fetchItems();
        fetchNotificationCount();
      }
    } catch (error) {
      setMessage(`Error running background jobs: ${error.message}`);
    }
    
    setBackgroundJobStatus('idle');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate form data
    if (!newItem.name.trim()) {
      setMessage('Item name is required');
      setLoading(false);
      return;
    }

    if (!newItem.expiryDate) {
      setMessage('Expiry date is required');
      setLoading(false);
      return;
    }

    // Check if expiry date is in the future
    const expiryDate = new Date(newItem.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (expiryDate < today) {
      setMessage('Expiry date must be in the future');
      setLoading(false);
      return;
    }

    try {
      console.log('Adding item:', newItem);
      const data = await apiCall('http://localhost:5000/api/items', {
        method: 'POST',
        body: JSON.stringify({
          name: newItem.name.trim(),
          category: newItem.category,
          expiryDate: newItem.expiryDate
        })
      });
      
      if (data) {
        setMessage('Item added successfully!');
        setNewItem({ name: '', category: 'Other', expiryDate: '' });
        setShowAddForm(false);
        fetchItems();
        fetchCategories();
      }
    } catch (error) {
      setMessage(`Error adding item: ${error.message}`);
    }

    setLoading(false);
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const data = await apiCall(`http://localhost:5000/api/items/${itemId}`, {
        method: 'DELETE'
      });

      if (data) {
        setMessage('Item deleted successfully!');
        fetchItems();
      }
    } catch (error) {
      setMessage(`Error deleting item: ${error.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiryDate) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: '#dc3545', text: 'Expired' };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'urgent', color: '#ffc107', text: `${daysUntilExpiry} days left` };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'warning', color: '#fd7e14', text: `${daysUntilExpiry} days left` };
    } else {
      return { status: 'good', color: '#28a745', text: `${daysUntilExpiry} days left` };
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  const exportToCSV = () => {
    if (items.length === 0) {
      setMessage('No items to export');
      return;
    }

    const csvContent = [
      // CSV Header
      ['Name', 'Category', 'Expiry Date', 'Status', 'Days Until Expiry', 'Added Date'],
      // CSV Data
      ...items.map(item => {
        const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
        const status = daysUntilExpiry < 0 ? 'Expired' : 
                      daysUntilExpiry <= 3 ? 'Urgent' : 
                      daysUntilExpiry <= 7 ? 'Warning' : 'Good';
        
        return [
          item.name,
          item.category,
          formatDate(item.expiryDate),
          status,
          daysUntilExpiry,
          formatDate(item.createdAt)
        ];
      })
    ].map(row => row.join(',')).join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartexpiry-inventory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage('Inventory exported successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!user) {
    return <div className="dashboard-container">Please log in to access the dashboard.</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>SmartExpiry Dashboard</h1>
        <p>Welcome, {user.name}</p>
        <div className="dashboard-actions">
          <div 
            className="notification-bell"
            onClick={() => setShowNotifications(true)}
          >
            🔔
            {unreadNotifications > 0 && (
              <span className="notification-badge">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </div>
          <button 
            className="settings-btn"
            onClick={() => setShowNotificationSettings(true)}
            title="Notification Settings"
          >
            ⚙️
          </button>
          <button 
            className="add-item-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Background Job Status */}
      <div className="background-job-status">
        <div className="status-info">
          <span className="status-label">Background Jobs:</span>
          <span className={`status-indicator ${backgroundJobStatus}`}>
            {backgroundJobStatus === 'running' ? '🔄 Running' : '✅ Idle'}
          </span>
          {lastUpdate && (
            <span className="last-update">Last update: {lastUpdate}</span>
          )}
        </div>
        <div className="action-buttons">
          <button 
            onClick={triggerBackgroundJobs}
            disabled={backgroundJobStatus === 'running'}
            className="trigger-jobs-btn"
          >
            {backgroundJobStatus === 'running' ? 'Running...' : '🔄 Run Background Jobs'}
          </button>
          <button 
            onClick={exportToCSV}
            className="export-btn"
            disabled={items.length === 0}
          >
            📊 Export to CSV
          </button>
          <button 
            onClick={() => setShowAnalytics(true)}
            className="analytics-btn"
          >
            📈 Analytics
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="good">Good</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
          
          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-item-form">
          <h3>Add New Item</h3>
          <form onSubmit={handleAddItem}>
            <input
              type="text"
              placeholder="Item Name (e.g., Milk, Yogurt)"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              required
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              required
            >
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Produce">Produce</option>
              <option value="Pantry">Pantry</option>
              <option value="Frozen">Frozen</option>
              <option value="Beverages">Beverages</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="date"
              value={newItem.expiryDate}
              onChange={(e) => setNewItem({...newItem, expiryDate: e.target.value})}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </form>
        </div>
      )}

      <div className="items-grid">
        {items.map((item) => {
          const expiryStatus = getExpiryStatus(item.expiryDate);
          
          return (
            <div key={item._id} className={`item-card ${expiryStatus.status}`}>
              <div className="item-header">
                <h3>{item.name}</h3>
                <span 
                  className="expiry-status"
                  style={{ backgroundColor: expiryStatus.color }}
                >
                  {expiryStatus.text}
                </span>
              </div>
              
              <div className="item-details">
                <p><strong>Category:</strong> {item.category}</p>
                <p><strong>Expiry Date:</strong> {formatDate(item.expiryDate)}</p>
                <p><strong>Added by:</strong> {item.addedBy?.name || 'You'}</p>
                <p><strong>Added on:</strong> {formatDate(item.createdAt)}</p>
              </div>

              <div className="qr-code-section">
                <h4>QR Code</h4>
                <img 
                  src={item.qrCode} 
                  alt="Item QR Code" 
                  className="qr-code"
                />
                <p className="qr-info">Scan to view item details</p>
              </div>

              <button 
                className="delete-btn"
                onClick={() => handleDeleteItem(item._id)}
              >
                Delete Item
              </button>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="no-items">
          <p>
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' 
              ? 'No items match your search criteria. Try adjusting your filters.'
              : 'No items found. Add your first item to start tracking expiry dates!'
            }
          </p>
        </div>
      )}

      {showNotifications && (
        <Notifications 
          onClose={() => {
            setShowNotifications(false);
            fetchNotificationCount();
          }}
        />
      )}

      {showNotificationSettings && (
        <NotificationSettings 
          onClose={() => setShowNotificationSettings(false)}
        />
      )}

      {showAnalytics && (
        <Analytics 
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
};

export default Dashboard; 