import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

function VerificationStatus() {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('status');
    const m = params.get('message') || 'Please check your email.';

    setStatus(s);
    setMessage(m);
  }, [location.search]);

  const isSuccess = status === 'success';

  return (
    <>
      {/* 🔹 Inline CSS */}
      <style>{`
        .verification-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top, #1f2933, #0f172a);
        }

        .verification-card {
          width: 100%;
          max-width: 460px;
          padding: 36px 38px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 20px 45px rgba(0,0,0,0.65);
          text-align: center;
          color: #e5e7eb;
        }

        .verification-card h2 {
          margin-bottom: 14px;
          font-size: 1.9rem;
        }

        .success-title {
          color: #00ff99;
        }

        .error-title {
          color: #ff4b5c;
        }

        .verification-message {
          font-size: 1rem;
          color: #cbd5f5;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .verification-link {
          display: inline-block;
          padding: 12px 26px;
          border-radius: 999px;
          background: #38bdf8;
          color: #0f172a;
          font-weight: bold;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .verification-link:hover {
          background: #0ea5e9;
          transform: translateY(-2px);
        }
      `}</style>

      {/* 🔹 UI */}
      <div className="verification-page">
        <div className="verification-card">
          {!status ? (
            <>
              <h2>Verifying...</h2>
              <p>Please wait while we verify your email.</p>
            </>
          ) : (
            <>
              <h2 className={isSuccess ? 'success-title' : 'error-title'}>
                {isSuccess ? 'Verification Successful 🎉' : 'Verification Failed 🛑'}
              </h2>

              <p className="verification-message">{message}</p>

              {isSuccess ? (
                <Link to="/login" className="verification-link">
                  Go to Login
                </Link>
              ) : (
                <Link to="/register" className="verification-link">
                  Register Again
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default VerificationStatus;
