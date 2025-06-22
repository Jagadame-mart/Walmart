import React, { useState, useEffect } from 'react';
import './analytics.css';

const Analytics = ({ onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    expiredItems: 0,
    expiringSoon: 0,
    goodItems: 0,
    categories: {},
    monthlyTrend: {}
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/items', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        calculateStats(data);
      } else {
        const errorData = await response.json();
        if (errorData.code === 'TOKEN_EXPIRED' || errorData.code === 'INVALID_TOKEN') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (itemsData) => {
    const now = new Date();
    const stats = {
      totalItems: itemsData.length,
      expiredItems: 0,
      expiringSoon: 0,
      goodItems: 0,
      categories: {},
      monthlyTrend: {}
    };

    itemsData.forEach(item => {
      const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - now) / (1000 * 60 * 60 * 24));
      
      // Count by status
      if (daysUntilExpiry < 0) {
        stats.expiredItems++;
      } else if (daysUntilExpiry <= 7) {
        stats.expiringSoon++;
      } else {
        stats.goodItems++;
      }

      // Count by category
      stats.categories[item.category] = (stats.categories[item.category] || 0) + 1;

      // Monthly trend (items added per month)
      const addedDate = new Date(item.createdAt);
      const monthKey = `${addedDate.getFullYear()}-${String(addedDate.getMonth() + 1).padStart(2, '0')}`;
      stats.monthlyTrend[monthKey] = (stats.monthlyTrend[monthKey] || 0) + 1;
    });

    setStats(stats);
  };

  const getPercentage = (value, total) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const getCategoryColor = (index) => {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="analytics-overlay" onClick={onClose}>
        <div className="analytics-panel" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-overlay" onClick={onClose}>
      <div className="analytics-panel" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <h3>📊 Inventory Analytics</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="analytics-content">
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h4>Total Items</h4>
                <p className="stat-number">{stats.totalItems}</p>
              </div>
            </div>
            
            <div className="stat-card expired">
              <div className="stat-icon">⚠️</div>
              <div className="stat-info">
                <h4>Expired</h4>
                <p className="stat-number">{stats.expiredItems}</p>
                <p className="stat-percentage">{getPercentage(stats.expiredItems, stats.totalItems)}%</p>
              </div>
            </div>
            
            <div className="stat-card expiring">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <h4>Expiring Soon</h4>
                <p className="stat-number">{stats.expiringSoon}</p>
                <p className="stat-percentage">{getPercentage(stats.expiringSoon, stats.totalItems)}%</p>
              </div>
            </div>
            
            <div className="stat-card good">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h4>Good</h4>
                <p className="stat-number">{stats.goodItems}</p>
                <p className="stat-percentage">{getPercentage(stats.goodItems, stats.totalItems)}%</p>
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="chart-section">
            <h4>📂 Category Distribution</h4>
            <div className="category-chart">
              {Object.entries(stats.categories).map(([category, count], index) => (
                <div key={category} className="category-bar">
                  <div className="category-label">
                    <span 
                      className="category-color" 
                      style={{ backgroundColor: getCategoryColor(index) }}
                    ></span>
                    {category}
                  </div>
                  <div className="category-bar-container">
                    <div 
                      className="category-bar-fill"
                      style={{ 
                        width: `${getPercentage(count, stats.totalItems)}%`,
                        backgroundColor: getCategoryColor(index)
                      }}
                    ></div>
                    <span className="category-count">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="insights-section">
            <h4>💡 Insights</h4>
            <div className="insights-list">
              {stats.expiredItems > 0 && (
                <div className="insight-item warning">
                  <span>⚠️</span>
                  <p>{stats.expiredItems} item{stats.expiredItems > 1 ? 's' : ''} have expired. Consider removing them.</p>
                </div>
              )}
              
              {stats.expiringSoon > 0 && (
                <div className="insight-item info">
                  <span>⏰</span>
                  <p>{stats.expiringSoon} item{stats.expiringSoon > 1 ? 's' : ''} expiring soon. Plan your meals accordingly.</p>
                </div>
              )}
              
              {Object.entries(stats.categories).length > 0 && (
                <div className="insight-item success">
                  <span>📊</span>
                  <p>Most items are in <strong>{Object.entries(stats.categories).sort(([,a], [,b]) => b - a)[0][0]}</strong> category.</p>
                </div>
              )}
              
              {stats.totalItems === 0 && (
                <div className="insight-item info">
                  <span>📝</span>
                  <p>No items yet. Add your first item to start tracking!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 