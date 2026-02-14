import React from 'react';
import './LoadingSpinner.css';

/**
 * Universal Loading Spinner Component
 * Provides consistent loading states across the application
 * 
 * Props:
 * - size: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * - message: string - Optional loading message to display
 * - fullPage: boolean - If true, centers spinner in full viewport
 * - inline: boolean - If true, displays inline without centering
 * - className: string - Additional CSS classes
 */
const LoadingSpinner = ({ 
  size = 'md', 
  message, 
  fullPage = false, 
  inline = false,
  className = '' 
}) => {
  const spinner = (
    <div className={`loading-spinner loading-spinner-${size} ${className}`}>
      <div className="spinner"></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-spinner-fullpage">
        {spinner}
      </div>
    );
  }

  if (inline) {
    return spinner;
  }

  return (
    <div className="loading-spinner-container">
      {spinner}
    </div>
  );
};

/**
 * Loading State wrapper for sections/panels
 * Use this when you need a loading state for a specific section
 */
export const LoadingState = ({ message = 'Loading...', className = '' }) => (
  <div className={`loading-state ${className}`}>
    <div className="spinner"></div>
    <p>{message}</p>
  </div>
);

/**
 * Skeleton loader for content placeholders
 */
export const SkeletonLine = ({ width = '100%', height = '16px', className = '' }) => (
  <div 
    className={`skeleton-line ${className}`}
    style={{ width, height }}
  />
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <SkeletonLine width="60%" height="20px" />
    <SkeletonLine width="100%" height="14px" />
    <SkeletonLine width="80%" height="14px" />
  </div>
);

export default LoadingSpinner;
