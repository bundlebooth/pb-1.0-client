/**
 * Admin Protected Route Component
 * Guards admin routes - only allows access if user has isAdmin flag
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <LoadingSpinner 
        fullPage 
        message="Verifying admin access..." 
      />
    );
  }

  // If not logged in, redirect to home with login prompt
  if (!currentUser) {
    return <Navigate to="/?login=true" state={{ from: location }} replace />;
  }

  // If logged in but not admin, redirect to regular dashboard
  if (!currentUser.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and is an admin - render children
  return children;
};

export default AdminProtectedRoute;
