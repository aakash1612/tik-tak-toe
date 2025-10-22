import React, { useState } from 'react';
import api from '../api'; 
import { useNavigate, Link } from 'react-router-dom';

function Register({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('Registering user:');
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const res = await api.post('/api/auth/register', {
        username,
        email,
        password,
      });

      if(res.data.requiresVerification){
          setSuccess(`Check your inbox! A verification link has been sent to ${email}. Please verify your email before logging in.`);
      }
      else{
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        setSuccess(`Registration successful! Redirecting...`);
        setTimeout(() => {
          onAuth();
          navigate('/lobby');
        }, 1000);
      }
      

      

    } catch (err) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleRegister}>
        
        {/* Input 1: Username */}
        <div style={{ marginBottom: '15px' }}> {/* Adds 15px space below */}
            <input
              type="text"
              value={username}
              placeholder="Username"
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
                setSuccess(false);
              }}
              required
            />
        </div>

        {/* Input 2: Email */}
        <div style={{ marginBottom: '15px' }}> {/* Adds 15px space below */}
            <input
              type="email"
              value={email}
              placeholder="Email"
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
                setSuccess(false);
              }}
              required
            />
        </div>

        {/* Input 3: Password */}
        <div style={{ marginBottom: '20px' }}> {/* Adds slightly more space before button */}
            <input
              type="password"
              value={password}
              placeholder="Password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
                setSuccess(false);
              }}
              required
            />
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}

export default Register;