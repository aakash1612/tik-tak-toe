import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

function VerificationStatus() {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Parse query parameters from the URL: /verification-status?status=success&message=...
    const params = new URLSearchParams(location.search);
    const s = params.get('status');
    const m = params.get('message') || 'Please check your email.';
    
    setStatus(s);
    setMessage(m);
  }, [location.search]);

  if (!status) {
    return (
      <div className="container">
        <h2>Verifying...</h2>
        <p>If you were redirected here, please wait.</p>
      </div>
    );
  }

  const isSuccess = status === 'success';

  return (
    <div className="container">
      <h2 style={{ color: isSuccess ? 'green' : 'red' }}>
        {isSuccess ? 'Verification Successful! 🎉' : 'Verification Failed 🛑'}
      </h2>
      <p>{message}</p>
      <p>
        {isSuccess ? (
          <Link to="/login">Click here to log in</Link>
        ) : (
          <Link to="/register">Try registering again</Link>
        )}
      </p>
    </div>
  );
}

export default VerificationStatus;