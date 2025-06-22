import React, { useState } from 'react';
import './registerstyle.css';

const Register = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (activeTab === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          setMessage('Passwords do not match');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setMessage('Registration successful! Please login.');
          setFormData({ name: '', email: '', password: '', confirmPassword: '' });
          setActiveTab('login');
        } else {
          setMessage(data.message || 'Registration failed');
        }
      } else {
        const response = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setMessage('Login successful!');
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setFormData({ name: '', email: '', password: '', confirmPassword: '' });
          
          // Reload the page to trigger app re-render
          window.location.reload();
        } else {
          setMessage(data.message || 'Login failed');
        }
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className='auth-container'>
      <div className='tabs'>
        <button
          className={activeTab === 'login' ? 'active' : ''}
          onClick={() => setActiveTab('login')}
        >
          Login
        </button>
        <button
          className={activeTab === 'signup' ? 'active' : ''}
          onClick={() => setActiveTab('signup')}
        >
          Sign Up
        </button>
      </div>
      
      {message && (
        <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {activeTab === 'login' ? (
        <form className='form' onSubmit={handleSubmit}>
          <h2>Login</h2>
          <input 
            type='email' 
            name='email'
            placeholder='Email Address' 
            value={formData.email}
            onChange={handleInputChange}
            required 
          />
          <input 
            type='password' 
            name='password'
            placeholder='Password' 
            value={formData.password}
            onChange={handleInputChange}
            required 
          />
          <button type='submit' disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className='link'>Forgot Password?</p>
        </form>
      ) : (
        <form className='form' onSubmit={handleSubmit}>
          <h2>Sign Up</h2>
          <input 
            type='text' 
            name='name'
            placeholder='Full Name' 
            value={formData.name}
            onChange={handleInputChange}
            required 
          />
          <input 
            type='email' 
            name='email'
            placeholder='Email Address' 
            value={formData.email}
            onChange={handleInputChange}
            required 
          />
          <input 
            type='password' 
            name='password'
            placeholder='Password' 
            value={formData.password}
            onChange={handleInputChange}
            required 
          />
          <input 
            type='password' 
            name='confirmPassword'
            placeholder='Confirm Password' 
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required 
          />
          <button type='submit' disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Register;