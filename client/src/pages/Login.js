import { Link , useNavigate  } from 'react-router-dom';
import React, { useState } from 'react';
import api from '../api'; 
import './Login.css';

const Login = ({ onAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/login', {
        username,
        password,
      });

      // Store both Access Token and Refresh Token
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      
      // localStorage.setItem('refreshTokenExpiresAt', res.data.refreshTokenExpiresAt);

      onAuth();
      navigate('/lobby');
    } 
    catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } 
    finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="login-page">
    <div className="login-card">
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="text"
          value={username}
          placeholder="Username or Email"
          onChange={(e) => {
            setUsername(e.target.value);
            setLoginError('');
          }}
          required
        />

        <input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => {
            setPassword(e.target.value);
            setLoginError('');
          }}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {loginError && <p className="error-message">{loginError}</p>}
      <div className="auth-links">
      <p>
        Don’t have an account? <Link to="/register">Register here</Link>
      </p>
      <p>
        <Link to="/forgot-password">Forgot Password?</Link>
      </p>
      </div>
    </div>
  </div>
);

};

export default Login;