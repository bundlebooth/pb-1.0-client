import React from 'react';

/**
 * PageWrapper Component
 * Universal page wrapper that provides consistent max-width and padding across all pages.
 * 
 * Settings are controlled by CSS variables in index.css:
 * - --page-max-width: Maximum width of content (default: 1760px)
 * - --page-padding-x: Horizontal padding (responsive: 24px -> 40px -> 80px)
 * 
 * Usage:
 * <PageWrapper>
 *   <YourContent />
 * </PageWrapper>
 * 
 * Props:
 * - variant: 'standard' | 'fullWidth' | 'narrow' | 'dashboard' | 'admin' (default: 'standard')
 * - noPadding: If true, removes horizontal padding
 * - className: Additional classes to add
 * - style: Additional inline styles
 * - as: HTML element to render as (default: 'div')
 */

const variantStyles = {
  standard: {
    maxWidth: 'var(--page-max-width, 1760px)',
    padding: '0 var(--page-padding-x, 24px)',
  },
  fullWidth: {
    maxWidth: '100%',
    padding: '0',
  },
  narrow: {
    maxWidth: '1200px',
    padding: '0 var(--page-padding-x, 24px)',
  },
  dashboard: {
    maxWidth: '100%',
    padding: '0',
  },
  admin: {
    maxWidth: '100%',
    padding: '0',
  },
};

function PageWrapper({ 
  children, 
  variant = 'standard',
  noPadding = false, 
  className = '', 
  style = {},
  as: Component = 'div'
}) {
  const variantStyle = variantStyles[variant] || variantStyles.standard;
  
  const combinedStyle = {
    maxWidth: variantStyle.maxWidth,
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    boxSizing: 'border-box',
    padding: noPadding ? '0' : variantStyle.padding,
    ...style,
  };
  
  const wrapperClass = `page-wrapper page-wrapper--${variant} ${className}`.trim();
  
  return (
    <Component 
      className={wrapperClass} 
      style={combinedStyle}
    >
      {children}
    </Component>
  );
}

/**
 * PageLayout Component
 * Full page layout wrapper that enforces consistent structure across all pages.
 * Use this as the outermost wrapper for any page component.
 * 
 * Props:
 * - variant: 'standard' | 'fullWidth' | 'narrow' | 'dashboard' | 'admin'
 * - pageClassName: Class name for the page container
 * - contentClassName: Class name for the content wrapper
 * - backgroundColor: Background color for the page (default: '#ffffff')
 * - minHeight: Minimum height (default: '100vh')
 * - noPadding: If true, removes padding from content wrapper
 * - style: Additional inline styles for the page container
 */
function PageLayout({
  children,
  variant = 'standard',
  pageClassName = '',
  contentClassName = '',
  backgroundColor = '#ffffff',
  minHeight = '100vh',
  noPadding = false,
  style = {},
}) {
  const pageStyle = {
    backgroundColor,
    minHeight,
    width: '100%',
    ...style,
  };

  return (
    <div className={`page-layout page-layout--${variant} ${pageClassName}`.trim()} style={pageStyle}>
      <PageWrapper variant={variant} noPadding={noPadding} className={contentClassName}>
        {children}
      </PageWrapper>
    </div>
  );
}

/**
 * ContentWrapper Component
 * Use inside PageLayout for sections that need the standard max-width constraint.
 * Useful when the page is fullWidth but certain sections need to be constrained.
 */
function ContentWrapper({
  children,
  variant = 'standard',
  className = '',
  style = {},
  as: Component = 'div',
}) {
  return (
    <PageWrapper variant={variant} className={className} style={style} as={Component}>
      {children}
    </PageWrapper>
  );
}

export default PageWrapper;
export { PageWrapper, PageLayout, ContentWrapper };
