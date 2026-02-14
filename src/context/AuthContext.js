import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    // First check localStorage for userSession (matches original)
    const storedUser = localStorage.getItem('userSession');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        window.currentUser = userData;
        
        // Fetch fresh profile picture if not present in stored session
        if (!userData.profilePicture && userData.id) {
          try {
            const profileResp = await fetch(`${API_BASE_URL}/users/${userData.id}/user-profile`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (profileResp.ok) {
              const profileData = await profileResp.json();
              const profilePic = profileData.profile?.ProfileImageURL || profileData.user?.ProfileImageURL || null;
              if (profilePic) {
                const updatedUser = { ...userData, profilePicture: profilePic, profileImageURL: profilePic };
                setCurrentUser(updatedUser);
                window.currentUser = updatedUser;
                localStorage.setItem('userSession', JSON.stringify(updatedUser));
              }
            }
          } catch (error) {
            console.error('Failed to fetch profile picture:', error);
          }
        }
        
        // Also fetch vendor status if user is a vendor
        if (userData.isVendor && !userData.vendorProfileId) {
          try {
            const response = await fetch(`${API_BASE_URL}/vendors/status?userId=${userData.id}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
              const vendorData = await response.json();
              if (vendorData.vendorProfileId) {
                const updatedUser = { ...userData, vendorProfileId: vendorData.vendorProfileId };
                setCurrentUser(updatedUser);
                window.currentUser = updatedUser;
                localStorage.setItem('userSession', JSON.stringify(updatedUser));
              }
            }
          } catch (error) {
            console.error('Failed to fetch vendor status:', error);
          }
        }
        
        setLoading(false);
        return;
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('userSession');
      }
    }
    
    // Fallback: check token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/verify-token`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const userData = {
            id: data.userId,
            userId: data.userId,
            name: data.name || data.email?.split('@')[0] || 'User',
            email: data.email,
            userType: data.isVendor ? 'vendor' : 'client',
            isVendor: data.isVendor || false,
            isAdmin: data.isAdmin || false,
            vendorProfileId: data.vendorProfileId,
            authProvider: data.authProvider || 'email',
            profilePicture: data.profilePicture || null
          };
          setCurrentUser(userData);
          window.currentUser = userData;
          localStorage.setItem('userSession', JSON.stringify(userData));
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }

  function simulateLogin(user) {
    const userData = {
      ...user,
      userId: user.id,
      isVendor: user.isVendor || false,
      isAdmin: user.isAdmin || false
    };
    setCurrentUser(userData);
    window.currentUser = userData;
    localStorage.setItem('userSession', JSON.stringify(userData));
    
    // Clear the setup banner dismiss flag so it shows on every login
    if (userData.id) {
      localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
    }
    
    // Update UI elements
    updateUserInterface(userData);
    
  }

  function updateUserInterface(user) {
    // Update profile button
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn && user.name) {
      profileBtn.textContent = user.name.charAt(0).toUpperCase();
      profileBtn.style.backgroundColor = 'var(--primary)';
      profileBtn.style.color = 'white';
    }
  }

  async function handleGoogleLogin(credential, accountType = null) {
    try {
      // Decode the credential to get user info
      const decodeJwt = (token) => {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join(''));
          return JSON.parse(jsonPayload);
        } catch (error) {
          console.error('Error decoding JWT:', error);
          return null;
        }
      };

      const decoded = decodeJwt(credential);
      if (!decoded) {
        throw new Error('Failed to decode Google credential');
      }

      const response = await fetch(`${API_BASE_URL}/users/social-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: decoded.email,
          name: decoded.name,
          authProvider: 'google',
          avatar: decoded.picture,
          accountType: accountType  // Pass account type if provided
        })
      });

      if (!response.ok) {
        throw new Error('Google login failed');
      }

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Backend returns user data directly
      const userData = {
        id: data.userId,
        userId: data.userId,
        name: data.name || data.email?.split('@')[0] || 'User',
        email: data.email,
        userType: data.isVendor ? 'vendor' : 'client',
        isVendor: data.isVendor || false,
        isAdmin: data.isAdmin || false,
        vendorProfileId: data.vendorProfileId || null,
        authProvider: data.authProvider || 'google',
        profilePicture: data.profilePicture || decoded.picture || null
      };
      
      setCurrentUser(userData);
      localStorage.setItem('userSession', JSON.stringify(userData));
      
      // Clear the setup banner dismiss flag so it shows on every login
      if (userData.id) {
        localStorage.removeItem(`vv_hideSetupReminderUntilComplete_${userData.id}`);
      }
      
      updateUserInterface(userData);
      
      return userData;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async function logout(reason = null) {
    localStorage.removeItem('token');
    localStorage.removeItem('userSession');
    setCurrentUser(null);
    window.currentUser = null;
    
    // Store logout reason for display on login page
    if (reason) {
      sessionStorage.setItem('logoutReason', reason);
    }
    
    // Reset UI
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.textContent = 'S';
      profileBtn.style.backgroundColor = 'var(--primary)';
    }
  }
  
  // Check for session timeout on API responses
  function handleSessionExpired() {
    logout('session_expired');
    sessionStorage.setItem('logoutReason', 'session_expired');
    window.location.href = '/?sessionExpired=true';
  }

  function updateUser(updatedData) {
    const newUserData = { ...currentUser, ...updatedData };
    setCurrentUser(newUserData);
    window.currentUser = newUserData;
    localStorage.setItem('userSession', JSON.stringify(newUserData));
    updateUserInterface(newUserData);
  }

  // Refresh user data from API (useful after profile picture upload)
  async function refreshUser() {
    if (!currentUser?.id) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/user-profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const user = data.user || {};
        const profile = data.profile || {};
        
        // Get profile picture - prioritize UserProfiles table, then Users table
        // Use consistent field name 'profilePicture' throughout the app
        const profilePic = profile.ProfileImageURL || user.ProfileImageURL || null;
        
        // Update with fresh profile picture
        const updatedData = {
          ...currentUser,
          profilePicture: profilePic,
          profileImageURL: profilePic, // Keep both for backwards compatibility
          firstName: user.FirstName || currentUser.firstName,
          lastName: user.LastName || currentUser.lastName,
          name: user.FirstName ? `${user.FirstName} ${user.LastName || ''}`.trim() : currentUser.name
        };
        
        setCurrentUser(updatedData);
        window.currentUser = updatedData;
        localStorage.setItem('userSession', JSON.stringify(updatedData));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }

  async function getVendorProfileId() {
    if (currentUser?.vendorProfileId) {
      return currentUser.vendorProfileId;
    }
    
    if (!currentUser?.id) {
      throw new Error('User not logged in');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/status?userId=${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch vendor status');
      
      const data = await response.json();
      if (data.isVendor && data.vendorProfileId) {
        setCurrentUser(prev => ({
          ...prev,
          vendorProfileId: data.vendorProfileId
        }));
        return data.vendorProfileId;
      } else {
        throw new Error('Vendor profile not found');
      }
    } catch (error) {
      console.error('Error fetching vendor status:', error);
      throw error;
    }
  }

  const value = {
    currentUser,
    setCurrentUser,
    simulateLogin,
    handleGoogleLogin,
    logout,
    handleSessionExpired,
    refreshUser,
    updateUser,
    getVendorProfileId,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
