import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiPost, apiGet } from '../utils/api';
import { showBanner } from '../utils/helpers';

function FacebookCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [status, setStatus] = useState('Processing Facebook login...');

  useEffect(() => {
    const handleFacebookCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const stateParam = searchParams.get('state');
      
      let returnUrl = '/';
      try {
        if (stateParam) {
          const state = JSON.parse(decodeURIComponent(stateParam));
          returnUrl = state.returnUrl || '/';
        }
      } catch (e) {
        console.error('Error parsing state:', e);
      }

      if (error) {
        setStatus('Facebook login was cancelled or failed.');
        showBanner('Facebook login was cancelled.', 'error');
        setTimeout(() => navigate(returnUrl), 2000);
        return;
      }

      if (!code) {
        setStatus('No authorization code received.');
        showBanner('Facebook login failed - no authorization code.', 'error');
        setTimeout(() => navigate(returnUrl), 2000);
        return;
      }

      try {
        setStatus('Completing login...');
        
        // Send the code to the backend to exchange for user data
        const response = await apiPost('/users/facebook-auth', {
          code,
          redirectUri: window.location.origin + '/auth/facebook/callback'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Facebook authentication failed');
        }

        const data = await response.json();
        
        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        const userDataObj = {
          id: data.userId,
          userId: data.userId,
          name: data.name,
          email: data.email,
          userType: data.isVendor ? 'vendor' : 'client',
          isVendor: data.isVendor || false,
          isAdmin: data.isAdmin || false,
          vendorProfileId: data.vendorProfileId || null,
          authProvider: 'facebook',
          profilePicture: data.profilePicture
        };

        setCurrentUser(userDataObj);
        window.currentUser = userDataObj;
        localStorage.setItem('userSession', JSON.stringify(userDataObj));

        if (userDataObj.id) {
          localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userDataObj.id}`);
        }

        showBanner('Successfully logged in with Facebook!', 'success');
        
        // Check if this is a new vendor that needs onboarding
        if (data.isNewUser && data.isVendor) {
          navigate('/vendor-onboarding');
        } else {
          navigate(returnUrl);
        }
      } catch (error) {
        console.error('Facebook callback error:', error);
        setStatus('Login failed. Redirecting...');
        showBanner(error.message || 'Facebook login failed. Please try again.', 'error');
        setTimeout(() => navigate(returnUrl), 2000);
      }
    };

    handleFacebookCallback();
  }, [searchParams, navigate, setCurrentUser]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f7f7f7'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #1877F2',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ margin: '0 0 10px', color: '#222' }}>{status}</h2>
        <p style={{ margin: 0, color: '#666' }}>Please wait...</p>
      </div>
    </div>
  );
}

export default FacebookCallback;
