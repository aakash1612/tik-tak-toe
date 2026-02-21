import React, { useState } from 'react';
import api from '../api'; 
import { useNavigate, Link } from 'react-router-dom';
import './Register.css'; 

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
      await api.post('/api/auth/register', {
        username : username.trim(),
        email : email.trim(),
        password,
      });
      if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
        }
    setSuccess('Registration successful! Redirecting to login...');

    setTimeout(() => {
    navigate('/login');
  }, 1000);    

    } catch (err) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="register-page">
    <div className="register-card">
      <h2>Register</h2>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <form onSubmit={handleRegister}>
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

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  </div>
);

}

export default Register;