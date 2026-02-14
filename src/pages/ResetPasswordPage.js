import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/reset-password/verify/${token}`);
        const data = await response.json();
        
        if (data.success) {
          setEmail(data.email);
          setStatus('valid');
        } else {
          setStatus('invalid');
          setMessage(data.message || 'Invalid or expired reset link');
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setStatus('invalid');
        setMessage('Unable to verify reset link. Please try again.');
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return { minLength, hasUpper, hasLower, hasNumber, isValid: minLength && hasUpper && hasLower && hasNumber };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    // Validate password strength
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setMessage('Password must be at least 8 characters with uppercase, lowercase, and a number');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/reset-password/complete/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      
      const data = await response.json();
      if (data.success) {
        setStatus('success');
        setMessage('Password reset successfully! You can now log in with your new password.');
      } else {
        setMessage(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage('Failed to reset password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
          <div style={styles.spinner}></div>
          <h2 style={styles.title}>Verifying Reset Link...</h2>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
          <div style={styles.iconError}>
            <i className="fas fa-times-circle"></i>
          </div>
          <h2 style={styles.title}>Invalid Reset Link</h2>
          <p style={styles.description}>{message}</p>
          <p style={styles.description}>
            This link may have expired or already been used. Please request a new password reset.
          </p>
          <a href="/" style={styles.link}>Return to Planbeau</a>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
          <div style={styles.iconSuccess}>
            <i className="fas fa-check-circle"></i>
          </div>
          <h2 style={styles.title}>Password Reset Complete!</h2>
          <p style={styles.description}>{message}</p>
          <a href="/" style={styles.primaryButton}>Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src="/images/planbeau-platform-assets/branding/logo.png" alt="Planbeau" style={styles.logo} />
        <h2 style={styles.title}>Reset Your Password</h2>
        <p style={styles.description}>
          Enter a new password for <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.togglePassword}
              >
                <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          {newPassword && (
            <div style={styles.validationList}>
              <div style={{ ...styles.validationItem, color: passwordValidation.minLength ? '#10b981' : '#ef4444' }}>
                <i className={`fas fa-${passwordValidation.minLength ? 'check' : 'times'}`}></i> At least 8 characters
              </div>
              <div style={{ ...styles.validationItem, color: passwordValidation.hasUpper ? '#10b981' : '#ef4444' }}>
                <i className={`fas fa-${passwordValidation.hasUpper ? 'check' : 'times'}`}></i> One uppercase letter
              </div>
              <div style={{ ...styles.validationItem, color: passwordValidation.hasLower ? '#10b981' : '#ef4444' }}>
                <i className={`fas fa-${passwordValidation.hasLower ? 'check' : 'times'}`}></i> One lowercase letter
              </div>
              <div style={{ ...styles.validationItem, color: passwordValidation.hasNumber ? '#10b981' : '#ef4444' }}>
                <i className={`fas fa-${passwordValidation.hasNumber ? 'check' : 'times'}`}></i> One number
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Confirm new password"
              required
            />
          </div>

          {confirmPassword && newPassword !== confirmPassword && (
            <p style={styles.errorText}>Passwords do not match</p>
          )}

          {message && <p style={styles.errorText}>{message}</p>}

          <button
            type="submit"
            disabled={saving || !passwordValidation.isValid || newPassword !== confirmPassword}
            style={{
              ...styles.primaryButton,
              opacity: (saving || !passwordValidation.isValid || newPassword !== confirmPassword) ? 0.6 : 1,
              cursor: (saving || !passwordValidation.isValid || newPassword !== confirmPassword) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <a href="/" style={styles.link}>Return to Planbeau</a>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '450px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  logo: {
    height: '40px',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '12px'
  },
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  form: {
    textAlign: 'left'
  },
  inputGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  togglePassword: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    padding: '4px'
  },
  validationList: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px'
  },
  validationItem: {
    fontSize: '12px',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  primaryButton: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    marginTop: '16px'
  },
  link: {
    display: 'block',
    marginTop: '20px',
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '14px'
  },
  iconSuccess: {
    fontSize: '48px',
    color: '#10b981',
    marginBottom: '16px'
  },
  iconError: {
    fontSize: '48px',
    color: '#ef4444',
    marginBottom: '16px'
  },
  errorText: {
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '8px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  }
};

export default ResetPasswordPage;
