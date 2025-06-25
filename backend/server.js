require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sowmyadevalla49:Sowmya@cluster0.owihemw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  notificationSettings: {
    enabled: { type: Boolean, default: true },
    daysBeforeExpiry: { type: Number, default: 3 },
    emailNotifications: { type: Boolean, default: false },
    soundEnabled: { type: Boolean, default: true },
    desktopNotifications: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Item Schema
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, default: 'Other' },
  expiryDate: { type: Date, required: true },
  qrCode: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  isExpired: { type: Boolean, default: false },
  notificationSent: { type: Boolean, default: false },
  lastStatusUpdate: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['expiry_warning', 'expired'], required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Background Job Functions
const updateItemStatuses = async () => {
  try {
    console.log('🔄 Running daily status update...');
    const now = new Date();
    
    // Update all items' expiry status
    const items = await Item.find();
    let updatedCount = 0;
    
    for (const item of items) {
      const isExpired = item.expiryDate < now;
      const needsUpdate = item.isExpired !== isExpired;
      
      if (needsUpdate) {
        item.isExpired = isExpired;
        item.lastStatusUpdate = now;
        await item.save();
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} item statuses`);
  } catch (error) {
    console.error('❌ Error updating item statuses:', error);
  }
};

const generateExpiryNotifications = async () => {
  try {
    console.log('🔔 Generating expiry notifications...');
    const users = await User.find({ 'notificationSettings.enabled': true });
    let notificationCount = 0;
    
    for (const user of users) {
      const daysBeforeExpiry = user.notificationSettings.daysBeforeExpiry;
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);
      
      const expiringItems = await Item.find({
        addedBy: user._id,
        expiryDate: { 
          $gte: new Date(), 
          $lte: warningDate 
        },
        notificationSent: false
      });
      
      for (const item of expiringItems) {
        const daysUntilExpiry = Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        const notification = new Notification({
          userId: user._id,
          itemId: item._id,
          message: `${item.name} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
          type: daysUntilExpiry <= 0 ? 'expired' : 'expiry_warning'
        });
        
        await notification.save();
        notificationCount++;
        
        // Mark notification as sent
        item.notificationSent = true;
        await item.save();
      }
    }
    
    console.log(`✅ Generated ${notificationCount} notifications`);
  } catch (error) {
    console.error('❌ Error generating notifications:', error);
  }
};

const cleanupOldNotifications = async () => {
  try {
    console.log('🧹 Cleaning up old notifications...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      read: true
    });
    
    console.log(`✅ Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
  }
};

// Schedule Background Jobs
// Run daily at 6:00 AM
cron.schedule('0 6 * * *', async () => {
  console.log('🌅 Starting daily background jobs...');
  await updateItemStatuses();
  await generateExpiryNotifications();
  await cleanupOldNotifications();
  console.log('✅ Daily background jobs completed');
});

// Run status updates every hour
cron.schedule('0 * * * *', async () => {
  await updateItemStatuses();
});

// Auth Middleware
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🔐 Auth check for:', req.method, req.path);
    console.log('Token present:', !!token);
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('✅ Token verified for user:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }
    
    console.log('✅ User authenticated:', user.name);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token format.',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ 
        message: 'Authentication failed.',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Login successful', 
      token, 
      user: { 
        name: user.name, 
        email: user.email,
        notificationSettings: user.notificationSettings
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Item Routes
app.post('/api/items', requireAuth, async (req, res) => {
  try {
    console.log('📝 Adding new item:', req.body);
    console.log('👤 User:', req.user.name);
    
    const { name, category, expiryDate } = req.body;

    // Validate required fields
    if (!name || !expiryDate) {
      return res.status(400).json({ message: 'Name and expiry date are required' });
    }

    // Generate unique item ID
    const itemId = new mongoose.Types.ObjectId().toString();
    
    // Generate QR code with item info
    const qrData = JSON.stringify({
      itemId,
      name,
      category,
      expiryDate,
      addedBy: req.user.name
    });
    
    const qrCode = await QRCode.toDataURL(qrData);

    // Create new item
    const item = new Item({
      name,
      category: category || 'Other',
      expiryDate: new Date(expiryDate),
      qrCode,
      addedBy: req.user._id
    });

    await item.save();
    console.log('✅ Item saved successfully:', item._id);

    res.status(201).json({ 
      message: 'Item added successfully',
      item: {
        id: item._id,
        name: item.name,
        category: item.category,
        expiryDate: item.expiryDate,
        qrCode: item.qrCode
      }
    });
  } catch (error) {
    console.error('❌ Add item error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

app.get('/api/items', requireAuth, async (req, res) => {
  try {
    const { search, category, status } = req.query;
    
    let query = {};
    
    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const items = await Item.find(query)
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    // Check for expired items and apply status filter
    const now = new Date();
    let updatedItems = items.map(item => ({
      ...item.toObject(),
      isExpired: item.expiryDate < now
    }));

    // Filter by status (expired, expiring soon, good)
    if (status) {
      updatedItems = updatedItems.filter(item => {
        const daysUntilExpiry = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));
        
        switch (status) {
          case 'expired':
            return daysUntilExpiry < 0;
          case 'expiring_soon':
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
          case 'good':
            return daysUntilExpiry > 7;
          default:
            return true;
        }
      });
    }

    res.json(updatedItems);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/items/:id', requireAuth, async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Delete associated notifications
    await Notification.deleteMany({ itemId: req.params.id });
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Notification Routes
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('itemId', 'name expiryDate')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check for expiring items and create notifications
app.get('/api/check-expiring-items', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.notificationSettings.enabled) {
      return res.json({ message: 'Notifications disabled' });
    }

    const daysBeforeExpiry = user.notificationSettings.daysBeforeExpiry;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);

    const expiringItems = await Item.find({
      addedBy: req.user._id,
      expiryDate: { 
        $gte: new Date(), 
        $lte: warningDate 
      },
      notificationSent: false
    });

    const notifications = [];

    for (const item of expiringItems) {
      const daysUntilExpiry = Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      
      const notification = new Notification({
        userId: req.user._id,
        itemId: item._id,
        message: `${item.name} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`,
        type: daysUntilExpiry <= 0 ? 'expired' : 'expiry_warning'
      });

      await notification.save();
      notifications.push(notification);

      // Mark notification as sent
      item.notificationSent = true;
      await item.save();
    }

    res.json({ 
      message: `${notifications.length} notifications created`,
      notifications 
    });
  } catch (error) {
    console.error('Check expiring items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unique categories
app.get('/api/categories', requireAuth, async (req, res) => {
  try {
    const categories = await Item.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Manual trigger for background jobs (for testing)
app.post('/api/trigger-background-jobs', requireAuth, async (req, res) => {
  try {
    console.log('🔄 Manual trigger of background jobs by user:', req.user.name);
    console.log('⏰ Starting background jobs...');
    
    await updateItemStatuses();
    console.log('✅ Status updates completed');
    
    await generateExpiryNotifications();
    console.log('✅ Notifications generated');
    
    await cleanupOldNotifications();
    console.log('✅ Cleanup completed');
    
    console.log('🎉 All background jobs completed successfully');
    res.json({ message: 'Background jobs completed successfully' });
  } catch (error) {
    console.error('❌ Background jobs error:', error);
    res.status(500).json({ message: 'Background jobs failed: ' + error.message });
  }
});

// User Settings Routes
app.get('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ notificationSettings: user.notificationSettings });
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const { notificationSettings } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notificationSettings },
      { new: true }
    );

    res.json({ 
      message: 'Settings updated successfully',
      notificationSettings: user.notificationSettings 
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'SmartExpiry server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('⏰ Background jobs scheduled:');
  console.log('   - Daily status updates: 6:00 AM');
  console.log('   - Hourly status checks: Every hour');
}); 