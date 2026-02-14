import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { showBanner } from '../utils/helpers';
import { apiGet, apiPost } from '../utils/api';
import { encryptCredentials, encryptRegistrationData } from '../utils/crypto';
import UniversalModal from './UniversalModal';

function ProfileModal({ isOpen, onClose, defaultView = 'login', defaultAccountType = 'client', hideAccountTypeSelector = false }) {
  const { currentUser, handleGoogleLogin, logout, setCurrentUser } = useAuth();
  const [view, setView] = useState(defaultView); // 'login', 'signup', 'twofa', 'loggedIn', 'googleAccountType'
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState(defaultAccountType);

  // Password validation function
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return { minLength, hasUpper, hasLower, hasNumber, isValid: minLength && hasUpper && hasLower && hasNumber };
  };

  const passwordValidation = validatePassword(signupPassword);
  const [twofaCode, setTwofaCode] = useState(['', '', '', '', '', '']);
  const [twofaEmail, setTwofaEmail] = useState('');
  const [twofaTempToken, setTwofaTempToken] = useState('');
  
  // Google Sign-In states
  const [googleAccountType, setGoogleAccountType] = useState('client');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState(null);

  // Facebook Sign-In states
  const [facebookInitialized, setFacebookInitialized] = useState(false);
  const [pendingFacebookData, setPendingFacebookData] = useState(null);
  const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID;

  // Session timeout message state
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setView('loggedIn');
      } else {
        setView(defaultView);
        setAccountType(defaultAccountType);
        setGoogleAccountType(defaultAccountType);
        // Check for session timeout message
        const logoutReason = sessionStorage.getItem('logoutReason');
        if (logoutReason === 'session_expired') {
          setSessionMessage('Your session has expired due to inactivity. Please log in again.');
          sessionStorage.removeItem('logoutReason');
        }
      }
      // Prevent background scrolling when modal is open
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      setSessionMessage(''); // Clear message when modal closes
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, currentUser, defaultView, defaultAccountType]);

  // Decode Google JWT to get user info
  const decodeGoogleJwt = (credential) => {
    try {
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding Google JWT:', error);
      return null;
    }
  };

  // Handle direct Google signup without account type selection (for vendor-only flow)
  const handleGoogleSignUpDirectly = async (credential, accountTypeToUse) => {
    try {
      setLoading(true);
      
      const decoded = decodeGoogleJwt(credential);
      if (!decoded) {
        throw new Error('Failed to decode Google credential');
      }

      const response = await apiPost('/users/social-login', {
        email: decoded.email,
        name: decoded.name,
        authProvider: 'google',
        avatar: decoded.picture,
        accountType: accountTypeToUse
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Google sign-in failed');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      const userData = {
        id: data.userId,
        userId: data.userId,
        name: data.name || data.email?.split('@')[0] || 'User',
        email: data.email,
        userType: data.isVendor ? 'vendor' : 'client',
        isVendor: data.isVendor || false,
        isAdmin: data.isAdmin || false,
        vendorProfileId: data.vendorProfileId || null
      };

      setCurrentUser(userData);
      window.currentUser = userData;
      localStorage.setItem('userSession', JSON.stringify(userData));
      
      if (userData.id) {
        localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
      }

      showBanner('Successfully signed in with Google!', 'success');
      onClose();

      // Check for pending vendor redirect (from become-a-vendor flow)
      const pendingVendorRedirect = sessionStorage.getItem('pendingVendorRedirect');
      if (pendingVendorRedirect === 'true') {
        sessionStorage.removeItem('pendingVendorRedirect');
        // Any user can proceed - BecomeVendorPage handles approved vendor redirect
        setTimeout(() => {
          window.location.href = '/become-a-vendor/setup';
        }, 300);
      }

      setPendingGoogleCredential(null);

    } catch (error) {
      console.error('Google sign-up error:', error);
      showBanner(error.message || 'Failed to sign in with Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleResponse = useCallback(async (response) => {
    try {
      // Decode the credential to check if user exists
      const decoded = decodeGoogleJwt(response.credential);
      if (!decoded) {
        showBanner('Failed to process Google login', 'error');
        return;
      }

      // Check if user already exists in our system
      const checkResponse = await apiGet(`/users/check-email?email=${encodeURIComponent(decoded.email)}`);
      const checkData = await checkResponse.json();

      if (checkData.exists) {
        // User exists, proceed with login directly
        setLoading(true);
        const userData = await handleGoogleLogin(response.credential);
        localStorage.setItem('userSession', JSON.stringify(userData));
        showBanner('Successfully logged in with Google!', 'success');
        onClose();
        setLoading(false);
      } else {
        // New user
        if (hideAccountTypeSelector) {
          // Skip account type selection, directly sign up with the default account type (vendor)
          setPendingGoogleCredential(response.credential);
          // Directly call the signup handler
          handleGoogleSignUpDirectly(response.credential, defaultAccountType);
        } else {
          // Show account type selection
          setPendingGoogleCredential(response.credential);
          setView('googleAccountType');
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      if (hideAccountTypeSelector) {
        // Skip account type selection, directly sign up with the default account type
        setPendingGoogleCredential(response.credential);
        handleGoogleSignUpDirectly(response.credential, defaultAccountType);
      } else {
        // If check fails, show account type selection as fallback
        setPendingGoogleCredential(response.credential);
        setView('googleAccountType');
      }
    }
  }, [handleGoogleLogin, onClose, hideAccountTypeSelector, defaultAccountType]);

  // Handle Google/Facebook Sign-In after account type selection
  const handleSocialSignInWithAccountType = async () => {
    // Handle Facebook signup with account type
    if (pendingFacebookData) {
      try {
        setLoading(true);
        const response = await apiPost('/users/social-login', {
          email: pendingFacebookData.email,
          name: pendingFacebookData.name,
          authProvider: 'facebook',
          avatar: pendingFacebookData.avatar,
          accountType: googleAccountType
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Facebook sign-up failed');
        }

        const data = await response.json();
        if (data.token) localStorage.setItem('token', data.token);

        const userData = {
          id: data.userId,
          userId: data.userId,
          name: data.name || pendingFacebookData.name,
          email: data.email,
          userType: data.isVendor ? 'vendor' : 'client',
          isVendor: data.isVendor || false,
          isAdmin: data.isAdmin || false,
          vendorProfileId: data.vendorProfileId || null,
          authProvider: 'facebook',
          profilePicture: data.profilePicture || pendingFacebookData.avatar
        };

        setCurrentUser(userData);
        window.currentUser = userData;
        localStorage.setItem('userSession', JSON.stringify(userData));
        
        if (userData.id) {
          localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
        }

        showBanner('Successfully signed in with Facebook!', 'success');
        onClose();

        if (userData.isVendor && data.isNewUser) {
          setTimeout(() => {
            window.location.href = '/become-a-vendor';
          }, 500);
        } else {
          const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
          if (postLoginRedirect) {
            sessionStorage.removeItem('postLoginRedirect');
            setTimeout(() => {
              window.location.href = postLoginRedirect;
            }, 300);
          }
        }

        setPendingFacebookData(null);
        setGoogleAccountType('client');
        return;
      } catch (error) {
        console.error('Facebook sign-up error:', error);
        showBanner(error.message || 'Failed to sign in with Facebook', 'error');
        setLoading(false);
        return;
      }
    }

    // Handle Google signup with account type
    if (!pendingGoogleCredential) {
      showBanner('Please try signing in again', 'error');
      setView('login');
      return;
    }

    try {
      setLoading(true);
      
      // Decode the credential to get user info
      const decoded = decodeGoogleJwt(pendingGoogleCredential);
      if (!decoded) {
        throw new Error('Failed to decode Google credential');
      }

      // Call social-login with account type
      const response = await apiPost('/users/social-login', {
        email: decoded.email,
        name: decoded.name,
        authProvider: 'google',
        avatar: decoded.picture,
        accountType: googleAccountType
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Google sign-in failed');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      const userData = {
        id: data.userId,
        userId: data.userId,
        name: data.name || data.email?.split('@')[0] || 'User',
        email: data.email,
        userType: data.isVendor ? 'vendor' : 'client',
        isVendor: data.isVendor || false,
        isAdmin: data.isAdmin || false,
        vendorProfileId: data.vendorProfileId || null
      };

      setCurrentUser(userData);
      window.currentUser = userData;
      localStorage.setItem('userSession', JSON.stringify(userData));
      
      // Clear the setup banner dismiss flag so it shows on every login
      if (userData.id) {
        localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
      }

      showBanner('Successfully signed in with Google!', 'success');
      onClose();

      // If vendor account and new user, redirect to become-a-vendor page
      if (userData.isVendor && data.isNewUser) {
        setTimeout(() => {
          window.location.href = '/become-a-vendor';
        }, 500);
      } else {
        // Check for post-login redirect (from email deep links)
        const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
        if (postLoginRedirect) {
          sessionStorage.removeItem('postLoginRedirect');
          setTimeout(() => {
            window.location.href = postLoginRedirect;
          }, 300);
        }
      }

      // Clear pending credential
      setPendingGoogleCredential(null);
      setGoogleAccountType('client');

    } catch (error) {
      console.error('Google sign-in error:', error);
      showBanner(error.message || 'Failed to sign in with Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Google Client ID - Set this in your .env file as REACT_APP_GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const [googleInitialized, setGoogleInitialized] = useState(false);

  // Initialize Facebook SDK
  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    
    const initFB = () => {
      if (window.FB) {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        setFacebookInitialized(true);
        console.log('Facebook SDK initialized successfully');
      }
    };
    
    window.fbAsyncInit = initFB;
    
    // If FB already loaded, init immediately
    if (window.FB) {
      initFB();
    } else {
      // Dynamically load the SDK if not present
      const existingScript = document.getElementById('facebook-jssdk');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          console.log('Facebook SDK script loaded');
          setTimeout(() => {
            if (window.FB) initFB();
          }, 500);
        };
        script.onerror = () => {
          console.error('Failed to load Facebook SDK');
        };
        document.body.appendChild(script);
      }
    }
  }, [FACEBOOK_APP_ID]);

  // Handle Facebook login response from react-facebook-login
  const handleFacebookResponse = async (response) => {
    if (!response || !response.email) {
      if (response?.status === 'unknown') {
        // User closed the popup
        return;
      }
      showBanner('Email permission is required for Facebook login.', 'error');
      return;
    }

    const userData = {
      email: response.email,
      name: response.name,
      picture: { data: { url: response.picture?.data?.url } }
    };

    try {
      // Check if user exists
      const checkResponse = await apiGet(`/users/check-email?email=${encodeURIComponent(userData.email)}`);
      const checkData = await checkResponse.json();

      if (checkData.exists) {
        // Existing user - login directly
        setLoading(true);
        const loginResponse = await apiPost('/users/social-login', {
          email: userData.email,
          name: userData.name,
          authProvider: 'facebook',
          avatar: userData.picture?.data?.url
        });

        if (!loginResponse.ok) {
          const error = await loginResponse.json();
          throw new Error(error.message || 'Facebook login failed');
        }

        const data = await loginResponse.json();
        if (data.token) localStorage.setItem('token', data.token);

        const userDataObj = {
          id: data.userId,
          userId: data.userId,
          name: data.name || userData.name,
          email: data.email,
          userType: data.isVendor ? 'vendor' : 'client',
          isVendor: data.isVendor || false,
          isAdmin: data.isAdmin || false,
          vendorProfileId: data.vendorProfileId || null,
          authProvider: 'facebook',
          profilePicture: data.profilePicture || userData.picture?.data?.url
        };

        setCurrentUser(userDataObj);
        window.currentUser = userDataObj;
        localStorage.setItem('userSession', JSON.stringify(userDataObj));
        
        if (userDataObj.id) {
          localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userDataObj.id}`);
        }
        
        showBanner('Successfully logged in with Facebook!', 'success');
        onClose();
        setLoading(false);
      } else {
        // New user - show account type selection or direct signup
        if (hideAccountTypeSelector) {
          setLoading(true);
          const signupResponse = await apiPost('/users/social-login', {
            email: userData.email,
            name: userData.name,
            authProvider: 'facebook',
            avatar: userData.picture?.data?.url,
            accountType: defaultAccountType
          });

          if (!signupResponse.ok) {
            const error = await signupResponse.json();
            throw new Error(error.message || 'Facebook sign-up failed');
          }

          const data = await signupResponse.json();
          if (data.token) localStorage.setItem('token', data.token);

          const userDataObj = {
            id: data.userId,
            userId: data.userId,
            name: data.name || userData.name,
            email: data.email,
            userType: data.isVendor ? 'vendor' : 'client',
            isVendor: data.isVendor || false,
            isAdmin: data.isAdmin || false,
            vendorProfileId: data.vendorProfileId || null,
            authProvider: 'facebook',
            profilePicture: data.profilePicture || userData.picture?.data?.url
          };

          setCurrentUser(userDataObj);
          window.currentUser = userDataObj;
          localStorage.setItem('userSession', JSON.stringify(userDataObj));
          
          showBanner('Successfully signed in with Facebook!', 'success');
          onClose();
          setLoading(false);
          
          if (userDataObj.isVendor) {
            window.location.href = '/vendor-onboarding';
          }
        } else {
          // Show account type selection
          setPendingFacebookData({
            email: userData.email,
            name: userData.name,
            avatar: userData.picture?.data?.url
          });
          setView('googleAccountType');
        }
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      showBanner(error.message || 'Facebook login failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  // Legacy handleFacebookLogin - kept for compatibility
  const handleFacebookLogin = () => {
    // This is now handled by react-facebook-login component
  };

  // Initialize Google Sign-In when modal opens and render button
  useEffect(() => {
    if (window.google && isOpen && GOOGLE_CLIENT_ID) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup'
        });
        setGoogleInitialized(true);
        
        // Render the Google button after a short delay to ensure DOM is ready
        setTimeout(() => {
          const buttonContainer = document.getElementById('google-signin-btn-container');
          if (buttonContainer && window.google) {
            buttonContainer.innerHTML = ''; // Clear previous button
            window.google.accounts.id.renderButton(
              buttonContainer,
              { 
                type: 'standard',
                theme: 'outline', 
                size: 'large', 
                width: 380,
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'left'
              }
            );
          }
        }, 100);
      } catch (error) {
        console.error('Google Sign-In initialization error:', error);
        setGoogleInitialized(false);
      }
    }
  }, [isOpen, view, handleGoogleResponse, GOOGLE_CLIENT_ID]);

  // Fallback trigger for custom button (if rendered button doesn't work)
  const triggerGoogleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      showBanner('Google Sign-In is not configured. Please use email/password to sign up.', 'info');
      return;
    }
    // The Google rendered button should handle this, but as fallback:
    showBanner('Please use the Google button that appears below.', 'info');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      showBanner('Please enter email and password', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Encrypt credentials before sending to hide from Network tab
      const encrypted = await encryptCredentials(loginEmail, loginPassword);
      const response = await apiPost('/users/login', { encrypted });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Check if 2FA is required
      if (data.twoFactorRequired) {
        setTwofaEmail(loginEmail);
        setTwofaTempToken(data.tempToken);
        setView('twofa');
        showBanner('Verification code sent to your email', 'info');
        return;
      }

      // Store token and user data
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      // Backend returns user data directly, not wrapped in data.user
      const userData = {
        id: data.userId,
        userId: data.userId,
        name: data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : data.email?.split('@')[0] || 'User',
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        userType: data.isVendor ? 'vendor' : 'client',
        isVendor: data.isVendor || false,
        isAdmin: data.isAdmin || false,
        vendorProfileId: data.vendorProfileId || null
      };
      
      setCurrentUser(userData);
      window.currentUser = userData;
      localStorage.setItem('userSession', JSON.stringify(userData));
      
      // Clear the setup banner dismiss flag so it shows on every login
      if (userData.id) {
        localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
      }
      
      showBanner('Successfully logged in!', 'success');
      onClose();
      
      // Check for pending vendor redirect (from become-a-vendor flow)
      const pendingVendorRedirect = sessionStorage.getItem('pendingVendorRedirect');
      if (pendingVendorRedirect === 'true') {
        sessionStorage.removeItem('pendingVendorRedirect');
        // Any user can proceed - BecomeVendorPage handles approved vendor redirect
        setTimeout(() => {
          window.location.href = '/become-a-vendor/setup';
        }, 300);
      } else {
        // Check for post-login redirect (from email deep links)
        const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
        if (postLoginRedirect) {
          sessionStorage.removeItem('postLoginRedirect');
          setTimeout(() => {
            window.location.href = postLoginRedirect;
          }, 300);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      showBanner(error.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!signupFirstName || !signupLastName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      showBanner('Please fill in all fields', 'error');
      return;
    }

    // Validate password strength
    if (!passwordValidation.isValid) {
      showBanner('Password must be at least 8 characters with uppercase, lowercase, and a number', 'error');
      return;
    }

    // Validate passwords match
    if (signupPassword !== signupConfirmPassword) {
      showBanner('Passwords do not match', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Encrypt registration data before sending to hide from Network tab
      const encrypted = await encryptRegistrationData({
        firstName: signupFirstName,
        lastName: signupLastName,
        email: signupEmail,
        password: signupPassword,
        accountType: accountType
      });
      const response = await apiPost('/users/register', { encrypted });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      // Backend returns user data directly
      const userData = {
        id: data.userId,
        userId: data.userId,
        name: data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : data.email?.split('@')[0] || 'User',
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        userType: data.isVendor ? 'vendor' : 'client',
        isVendor: data.isVendor || false,
        isAdmin: data.isAdmin || false,
        vendorProfileId: data.vendorProfileId || null
      };
      
      setCurrentUser(userData);
      window.currentUser = userData;
      localStorage.setItem('userSession', JSON.stringify(userData));
      
      // Clear the setup banner dismiss flag so it shows on every login
      if (userData.id) {
        localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
      }
      
      showBanner('Account created successfully!', 'success');
      onClose();
      
      // Check for pending vendor redirect (from become-a-vendor flow)
      const pendingVendorRedirect = sessionStorage.getItem('pendingVendorRedirect');
      if (pendingVendorRedirect === 'true') {
        sessionStorage.removeItem('pendingVendorRedirect');
        // New signup - always allow to proceed to vendor setup
        setTimeout(() => {
          window.location.href = '/become-a-vendor/setup';
        }, 300);
      } else if (userData.isVendor) {
        // New vendor signup - redirect to become-a-vendor setup steps
        setTimeout(() => {
          window.location.href = '/become-a-vendor/setup';
        }, 300);
      } else {
        // Check for post-login redirect (from email deep links)
        const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
        if (postLoginRedirect) {
          sessionStorage.removeItem('postLoginRedirect');
          setTimeout(() => {
            window.location.href = postLoginRedirect;
          }, 300);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      showBanner(error.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFAVerify = async () => {
    const code = twofaCode.join('');
    
    if (code.length !== 6) {
      showBanner('Please enter the 6-digit code', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await apiPost('/users/login/verify-2fa', { tempToken: twofaTempToken, code });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      const userData = {
        id: data.userId,
        userId: data.userId,
        name: data.name || data.email?.split('@')[0] || 'User',
        email: data.email,
        userType: data.isVendor ? 'vendor' : 'client',
        isVendor: data.isVendor || false,
        isAdmin: data.isAdmin || false,
        vendorProfileId: data.vendorProfileId || null
      };
      
      setCurrentUser(userData);
      window.currentUser = userData;
      localStorage.setItem('userSession', JSON.stringify(userData));
      
      // Clear the setup banner dismiss flag so it shows on every login
      if (userData.id) {
        localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
      }
      
      showBanner('Successfully verified!', 'success');
      onClose();
      
      // Check for post-login redirect (from email deep links)
      const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
      if (postLoginRedirect) {
        sessionStorage.removeItem('postLoginRedirect');
        setTimeout(() => {
          window.location.href = postLoginRedirect;
        }, 300);
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      showBanner('Invalid verification code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend2FA = async () => {
    try {
      const response = await apiPost('/auth/resend-2fa', { email: twofaEmail });
      const data = await response.json();
      if (data.alreadySent) {
        showBanner(data.message || 'A verification code was already sent. Please check your email.', 'info');
      } else {
        showBanner('Verification code resent', 'success');
      }
    } catch (error) {
      showBanner('Failed to resend code', 'error');
    }
  };

  const handleTwoFAInput = (index, value) => {
    // Handle paste - if pasting full code
    if (value.length > 1) {
      const pastedCode = value.replace(/\D/g, '').slice(0, 6);
      if (pastedCode.length > 0) {
        const newCode = pastedCode.split('').concat(['', '', '', '', '', '']).slice(0, 6);
        setTwofaCode(newCode);
        // Auto-verify if we have 6 digits
        if (pastedCode.length === 6) {
          setTimeout(() => {
            document.querySelector('.otp-verify-btn')?.click();
          }, 100);
        }
        return;
      }
    }
    
    if (!/^\d*$/.test(value)) return;

    const newCode = [...twofaCode];
    newCode[index] = value.slice(-1); // Take only last character
    setTwofaCode(newCode);

    // Auto-focus next input or auto-verify if complete
    if (value && index < 5) {
      const nextInput = document.querySelectorAll('.otp-digit')[index + 1];
      if (nextInput) nextInput.focus();
    } else if (value && index === 5) {
      // Last digit entered, auto-verify
      const fullCode = newCode.join('');
      if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
        setTimeout(() => {
          document.querySelector('.otp-verify-btn')?.click();
        }, 100);
      }
    }
  };

  const handleTwoFAKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newCode = [...twofaCode];
      
      if (twofaCode[index]) {
        // Clear current field
        newCode[index] = '';
        setTwofaCode(newCode);
      } else if (index > 0) {
        // Move to previous field and clear it
        newCode[index - 1] = '';
        setTwofaCode(newCode);
        const prevInput = document.querySelectorAll('.otp-digit')[index - 1];
        if (prevInput) prevInput.focus();
      }
    }
    
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.querySelectorAll('.otp-digit')[index - 1];
      if (prevInput) prevInput.focus();
    }
    
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      const nextInput = document.querySelectorAll('.otp-digit')[index + 1];
      if (nextInput) nextInput.focus();
    }
  };

  const handleLogout = () => {
    logout();
    setView('login');
    onClose();
    showBanner('Successfully logged out', 'success');
  };

  const handleViewDashboard = () => {
    onClose();
    // Trigger dashboard open event instead of using hash
    window.dispatchEvent(new CustomEvent('openDashboard'));
  };

  const getModalTitle = () => {
    if (view === 'login') return 'Welcome to Planbeau';
    if (view === 'signup') return 'Create Account';
    if (view === 'twofa') return 'Verify Your Account';
    if (view === 'googleAccountType') return 'Choose Account Type';
    if (view === 'forgotPassword') return 'Reset Password';
    if (view === 'loggedIn') return 'My Account';
    return 'Account';
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="small"
      showFooter={false}
    >
      <div>
          {/* Login Form */}
          {view === 'login' && (
            <form id="login-form" onSubmit={handleLogin}>
              {/* Session timeout message */}
              {sessionMessage && (
                <div style={{
                  backgroundColor: '#fef3f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <i className="fas fa-clock" style={{ fontSize: '16px', color: '#dc2626' }}></i>
                  <span style={{ color: '#991b1b', fontSize: '14px' }}>{sessionMessage}</span>
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#374151'
                }}>Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#5086E8'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  required
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#374151'
                }}>Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#5086E8'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  required
                />
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setView('forgotPassword')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#5086E8',
                      fontSize: '13px',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'inherit',
                      fontWeight: '500'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  backgroundColor: '#5086E8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '16px',
                  transition: 'background-color 0.2s',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4070D0')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#5086E8')}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Don't have an account? </span>
                <button 
                  type="button" 
                  onClick={() => setView('signup')} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#5086E8', 
                    fontSize: '14px', 
                    cursor: 'pointer', 
                    padding: 0, 
                    fontFamily: 'inherit',
                    fontWeight: '500'
                  }}
                >
                  Sign up
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
                <div style={{ padding: '0 16px', color: '#9CA3AF', fontSize: '14px', fontWeight: '500' }}>OR</div>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
{/* Google Sign-In Button Container - Google renders its own button here */}
                <div 
                  id="google-signin-btn-container" 
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'center',
                    minHeight: '44px'
                  }}
                >
                  {/* Fallback button while Google button loads */}
                  {!googleInitialized && (
                    <button
                      type="button"
                      onClick={triggerGoogleSignIn}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'white',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                        <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  )}
                </div>
                {FACEBOOK_APP_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      // Use OAuth redirect flow instead of SDK popup
                      const redirectUri = encodeURIComponent(window.location.origin + '/auth/facebook/callback');
                      const scope = encodeURIComponent('email,public_profile');
                      const state = encodeURIComponent(JSON.stringify({ returnUrl: window.location.pathname }));
                      const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=code`;
                      window.location.href = facebookAuthUrl;
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </button>
                )}
              </div>
              <p style={{ 
                textAlign: 'center', 
                fontSize: '12px', 
                color: '#9CA3AF',
                marginTop: '16px',
                marginBottom: 0
              }}>
                By signing up, you agree to our <a href="/terms-of-service" style={{ color: '#5086E8' }}>Terms of Service</a> and <a href="/privacy-policy" style={{ color: '#5086E8' }}>Privacy Policy</a>
              </p>
            </form>
          )}

          {/* Signup Form */}
          {view === 'signup' && (
            <form id="signup-form" onSubmit={handleSignup}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>First Name</label>
                  <input
                    type="text"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Last Name</label>
                  <input
                    type="text"
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  required
                />
              </div>
              {/* Password validation requirements */}
              {signupPassword && (
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '12px', 
                  backgroundColor: '#F9FAFB', 
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <div style={{ color: passwordValidation.minLength ? '#10b981' : '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`fas fa-${passwordValidation.minLength ? 'check' : 'times'}`} style={{ fontSize: '11px' }}></i> At least 8 characters
                  </div>
                  <div style={{ color: passwordValidation.hasUpper ? '#10b981' : '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`fas fa-${passwordValidation.hasUpper ? 'check' : 'times'}`} style={{ fontSize: '11px' }}></i> One uppercase letter
                  </div>
                  <div style={{ color: passwordValidation.hasLower ? '#10b981' : '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`fas fa-${passwordValidation.hasLower ? 'check' : 'times'}`} style={{ fontSize: '11px' }}></i> One lowercase letter
                  </div>
                  <div style={{ color: passwordValidation.hasNumber ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`fas fa-${passwordValidation.hasNumber ? 'check' : 'times'}`} style={{ fontSize: '11px' }}></i> One number
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Confirm Password</label>
                <input
                  type="password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: `1px solid ${signupConfirmPassword && signupPassword !== signupConfirmPassword ? '#ef4444' : 'var(--border)'}`, 
                    borderRadius: 'var(--radius)' 
                  }}
                  required
                />
                {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                  <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}>Passwords do not match</p>
                )}
              </div>
              {!hideAccountTypeSelector && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    color: '#374151',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="client">Client (I want to book vendors)</option>
                  <option value="vendor">Vendor (I provide services)</option>
                </select>
              </div>
              )}
              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  backgroundColor: '#5086E8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '1rem',
                  transition: 'background-color 0.2s',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4070D0')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#5086E8')}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <button type="button" onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: '#6B7280', textDecoration: 'underline', fontSize: '0.9rem', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Already have an account? Log in
                </button>
              </div>
              <p style={{ 
                textAlign: 'center', 
                fontSize: '12px', 
                color: '#9CA3AF',
                margin: 0
              }}>
                By signing up, you agree to our <a href="/terms-of-service" style={{ color: '#5086E8' }}>Terms of Service</a> and <a href="/privacy-policy" style={{ color: '#5086E8' }}>Privacy Policy</a>
              </p>
            </form>
          )}

          {/* Two-Factor Verification */}
          {view === 'twofa' && (
            <div id="twofa-form" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                Enter the 6-digit code we sent to your email: <strong>{twofaEmail}</strong>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Verification Code</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  {twofaCode.map((digit, index) => (
                    <input
                      key={index}
                      className="otp-digit"
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleTwoFAInput(index, e.target.value)}
                      onKeyDown={(e) => handleTwoFAKeyDown(index, e)}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (pastedData) {
                          handleTwoFAInput(0, pastedData);
                        }
                      }}
                      style={{ width: '44px', height: '48px', textAlign: 'center', fontSize: '1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                    />
                  ))}
                </div>
              </div>
              <button className="btn btn-primary otp-verify-btn" onClick={handleTwoFAVerify} disabled={loading} style={{ width: '100%', marginBottom: '0.75rem' }}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: 'auto' }}>
                <button className="btn btn-outline" onClick={handleResend2FA} style={{ flex: 1 }}>Resend Code</button>
                <button className="btn btn-outline" onClick={() => setView('login')} style={{ flex: 1 }}>Back</button>
              </div>
            </div>
          )}

          {/* Google Account Type Selection */}
          {view === 'googleAccountType' && (
            <div id="google-account-type-form" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <svg width="40" height="40" viewBox="0 0 18 18" style={{ marginBottom: '12px' }}>
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
                  <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
                </svg>
                <p style={{ 
                  color: '#6B7280', 
                  fontSize: '15px', 
                  margin: 0
                }}>
                  Welcome! How would you like to use Planbeau?
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Account Type
                </label>
                <select
                  value={googleAccountType}
                  onChange={(e) => setGoogleAccountType(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    color: '#374151',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="client">Client (I want to book vendors)</option>
                  <option value="vendor">Vendor (I provide services)</option>
                </select>
              </div>

              {googleAccountType === 'vendor' && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#D97706" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <div style={{ fontSize: '13px', color: '#92400E' }}>
                    After signing in, you'll be redirected to complete your vendor profile setup.
                  </div>
                </div>
              )}

              <button 
                onClick={handleSocialSignInWithAccountType}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#5086E8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '12px',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4070D0')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#5086E8')}
              >
                {loading ? 'Signing in...' : (pendingFacebookData ? 'Continue with Facebook' : 'Continue with Google')}
              </button>

              <button 
                onClick={() => {
                  setView('login');
                  setPendingGoogleCredential(null);
                  setPendingFacebookData(null);
                  setGoogleAccountType('client');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'white',
                  color: '#6B7280',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Forgot Password View */}
          {view === 'forgotPassword' && (
            <div id="forgot-password-form" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#F0F9FF',
                borderRadius: '12px',
                border: '1px solid #BAE6FD'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="2" style={{ marginBottom: '12px' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <p style={{ 
                  color: '#0369A1', 
                  fontSize: '14px', 
                  margin: 0,
                  fontWeight: '500'
                }}>
                  Enter your email and we'll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!loginEmail) {
                  showBanner('Please enter your email address', 'error');
                  return;
                }
                try {
                  setLoading(true);
                  const response = await apiPost('/users/forgot-password', { email: loginEmail });
                  const data = await response.json();
                  if (response.ok || data.success) {
                    if (data.alreadySent) {
                      showBanner(data.message || 'A password reset email was already sent. Please check your email (including spam folder).', 'info');
                    } else {
                      showBanner('Password reset link sent! Check your email.', 'success');
                      setView('login');
                    }
                  } else {
                    showBanner(data.message || 'Failed to send reset email', 'error');
                  }
                } catch (error) {
                  showBanner('Failed to send reset email. Please try again.', 'error');
                } finally {
                  setLoading(false);
                }
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '500',
                    fontSize: '14px',
                    color: '#374151'
                  }}>Email Address</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{ 
                      width: '100%', 
                      padding: '12px 16px', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#5086E8'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#5086E8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                    opacity: loading ? 0.7 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4070D0')}
                  onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#5086E8')}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <button 
                onClick={() => setView('login')}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'white',
                  color: '#6B7280',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Logged In View */}
          {view === 'loggedIn' && currentUser && (
            <div id="logged-in-view" style={{ textAlign: 'center' }}>
              <div className="profile-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600, margin: '0 auto 1rem' }}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>{currentUser.name || 'User'}</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>{currentUser.email || ''}</p>
              <button className="btn btn-primary" onClick={handleViewDashboard} style={{ width: '100%', marginBottom: '1rem' }}>
                View Dashboard
              </button>
              <button className="btn btn-outline" onClick={handleLogout} style={{ width: '100%' }}>
                Log Out
              </button>
            </div>
          )}
      </div>
    </UniversalModal>
  );
}

export default ProfileModal;
