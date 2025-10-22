import React, { useState } from 'react';
import api from '../api'; 
import { useNavigate, useSearchParams } from 'react-router-dom';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/auth/reset-password', {
        token,
        newPassword,
      });
      setMessage(res.data.message);

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Reset Password</h2>
      <form onSubmit={handleReset}>
        <input
          type="text"
          placeholder="Enter reset token"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setError('');
            setMessage('');
          }}
          required
        />
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setError('');
            setMessage('');
          }}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      {message && <p className="success">{message} Redirecting to login...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default ResetPassword;