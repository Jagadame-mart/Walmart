import React, { useState, useEffect } from 'react';
import Notifications from './Notifications';
import './dashboard.css';

const Dashboard = () => {
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Other', expiryDate: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [categories, setCategories] = useState([]);
  
  // Background job states
  const [backgroundJobStatus, setBackgroundJobStatus] = useState('idle');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    if (token) {
      fetchItems();
      fetchNotificationCount();
      fetchCategories();
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [searchTerm, selectedCategory, selectedStatus]);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await fetch(`http://localhost:5000/api/items?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadNotifications(data.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const triggerBackgroundJobs = async () => {
    setBackgroundJobStatus('running');
    setMessage('Running background jobs...');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/trigger-background-jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setMessage('Background jobs completed successfully!');
        setLastUpdate(new Date().toLocaleTimeString());
        // Refresh data
        fetchItems();
        fetchNotificationCount();
      } else {
        setMessage('Background jobs failed');
      }
    } catch (error) {
      setMessage('Error running background jobs');
    }
    
    setBackgroundJobStatus('idle');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newItem)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage('Item added successfully!');
        setNewItem({ name: '', category: 'Other', expiryDate: '' });
        setShowAddForm(false);
        fetchItems();
        fetchCategories();
      } else {
        setMessage(data.message || 'Failed to add item');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('Item deleted successfully!');
        fetchItems();
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to delete item');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
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
        <button 
          onClick={triggerBackgroundJobs}
          disabled={backgroundJobStatus === 'running'}
          className="trigger-jobs-btn"
        >
          {backgroundJobStatus === 'running' ? 'Running...' : '🔄 Run Background Jobs'}
        </button>
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
    </div>
  );
};

export default Dashboard; 