// Simple test script to verify backend API
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing SmartExpiry API...\n');

  // Test 1: Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/items`);
    console.log('✅ Server is running');
    console.log('Status:', response.status);
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('Error:', error.message);
    return;
  }

  // Test 2: Try to register a test user
  try {
    const registerResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });

    if (registerResponse.ok) {
      console.log('✅ User registration endpoint working');
    } else {
      const data = await registerResponse.json();
      console.log('⚠️ Registration response:', data.message);
    }
  } catch (error) {
    console.log('❌ Registration test failed:', error.message);
  }

  // Test 3: Try to login
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('✅ Login endpoint working');
      console.log('Token received:', !!data.token);
      
      // Test 4: Try to add an item with the token
      const addItemResponse = await fetch(`${BASE_URL}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.token}`
        },
        body: JSON.stringify({
          name: 'Test Milk',
          category: 'Dairy',
          expiryDate: '2024-12-31'
        })
      });

      if (addItemResponse.ok) {
        console.log('✅ Add item endpoint working');
      } else {
        const errorData = await addItemResponse.json();
        console.log('❌ Add item failed:', errorData.message);
      }

      // Test 5: Try to get items
      const getItemsResponse = await fetch(`${BASE_URL}/api/items`, {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });

      if (getItemsResponse.ok) {
        const items = await getItemsResponse.json();
        console.log('✅ Get items endpoint working');
        console.log('Items count:', items.length);
      } else {
        const errorData = await getItemsResponse.json();
        console.log('❌ Get items failed:', errorData.message);
      }

      // Test 6: Try background jobs
      const bgJobsResponse = await fetch(`${BASE_URL}/api/trigger-background-jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });

      if (bgJobsResponse.ok) {
        console.log('✅ Background jobs endpoint working');
      } else {
        const errorData = await bgJobsResponse.json();
        console.log('❌ Background jobs failed:', errorData.message);
      }

    } else {
      const data = await loginResponse.json();
      console.log('❌ Login failed:', data.message);
    }
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }

  console.log('\n🎉 API testing completed!');
}

testAPI().catch(console.error); 