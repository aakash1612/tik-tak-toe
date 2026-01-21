import React, { useState } from 'react';
import api from '../api'; 
import './ForgetPassword.css';

function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState(''); 
  const [error, setError] = useState('');     
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');    // Clear any previous messages
    setError('');      // Clear any previous errors
    setIsLoading(true); // Set loading to true when starting the request

    try {
      const res = await api.post('/api/auth/forgot-password', {
        username,
      });
      // The backend now sends a generic message. Use it directly.
      // E.g., "If an account with that username exists, a password reset link has been sent..."
      setMessage(res.data.message);
    } catch (err) {
      // General error message for user
      // Avoids giving away information about whether a username exists
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    }
     finally {
      setIsLoading(false); // Set loading to false once the request is complete (success or error)
    }
  };

  return (
  <div className="forgot-page">
    <div className="forgot-card">
      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter your username or email"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
            setMessage('');
          }}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending Request...' : 'Request Password Reset'}
        </button>
      </form>

      {/* Messages */}
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  </div>
);

}

export default ForgotPassword;