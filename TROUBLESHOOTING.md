# SmartExpiry Troubleshooting Guide

## 🔧 Common Issues and Solutions

### 1. "Invalid Token" Error

**Symptoms:**
- Getting "Invalid token" when adding items
- Cannot access dashboard features
- Background jobs not working

**Solutions:**

#### A. Check if Backend is Running
```bash
# In the backend directory
cd backend
npm start
```

You should see:
```
🚀 Server running on port 5000
⏰ Background jobs scheduled:
   - Daily status updates: 6:00 AM
   - Hourly status checks: Every hour
```

#### B. Test Backend Health
Open your browser and go to: `http://localhost:5000/api/health`

You should see:
```json
{
  "status": "OK",
  "message": "SmartExpiry server is running",
  "timestamp": "2024-...",
  "version": "1.0.0"
}
```

#### C. Clear Browser Storage and Re-login
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage
4. Refresh the page
5. Register/login again

#### D. Check Token in Browser
1. Open developer tools (F12)
2. Go to Console
3. Type: `localStorage.getItem('token')`
4. You should see a long string starting with "eyJ..."

### 2. Cannot Add Items

**Symptoms:**
- Form submission fails
- No error message or unclear error
- Items don't appear in dashboard

**Solutions:**

#### A. Check Form Data
- Make sure item name is not empty
- Ensure expiry date is selected
- Date must be in the future

#### B. Check Browser Console
1. Open developer tools (F12)
2. Go to Console tab
3. Try adding an item
4. Look for error messages or API call logs

#### C. Test API Directly
Run the test script:
```bash
node test-api.js
```

### 3. Background Jobs Not Working

**Symptoms:**
- "Run Background Jobs" button doesn't work
- No status updates
- No notifications generated

**Solutions:**

#### A. Check MongoDB Connection
Make sure your MongoDB connection string is correct in the backend.

#### B. Check Server Logs
Look for these messages in the backend console:
```
🔄 Manual trigger of background jobs by user: [username]
⏰ Starting background jobs...
✅ Status updates completed
✅ Notifications generated
✅ Cleanup completed
🎉 All background jobs completed successfully
```

#### C. Manual Test
1. Add some items with expiry dates in the next few days
2. Click "Run Background Jobs"
3. Check if notifications appear

### 4. Frontend Not Loading

**Symptoms:**
- White screen
- Cannot access the app
- Console errors

**Solutions:**

#### A. Check Frontend Server
```bash
# In the main directory
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

#### B. Check Dependencies
```bash
npm install
```

#### C. Clear Cache
- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try incognito/private mode

## 🐛 Debugging Steps

### 1. Enable Debug Logs
The app now has extensive logging. Check:
- **Backend console** for server-side logs
- **Browser console** for frontend logs

### 2. Test API Endpoints
Use the test script:
```bash
node test-api.js
```

### 3. Check Network Tab
1. Open developer tools (F12)
2. Go to Network tab
3. Try the action that's failing
4. Look for failed requests (red entries)
5. Check request/response details

### 4. Verify Database
Make sure your MongoDB database is accessible and contains data.

## 📞 Getting Help

If you're still having issues:

1. **Check the logs** - Both backend and frontend console
2. **Test the API** - Use the test script
3. **Verify setup** - Make sure all servers are running
4. **Clear storage** - Remove old tokens and re-login

## 🔄 Quick Reset

If nothing else works:

1. Stop all servers (Ctrl+C)
2. Clear browser localStorage
3. Restart backend: `cd backend && npm start`
4. Restart frontend: `npm run dev`
5. Register a new account
6. Test adding items

---

**Remember:** The app now has 7-day token expiration and better error handling. Most issues should be resolved with a fresh login. 