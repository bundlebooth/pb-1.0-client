/**
 * Shared UI Constants
 * SINGLE SOURCE OF TRUTH for consistent styling across the entire application
 * Import these constants instead of hardcoding values
 */

// ==================== COLORS ====================
export const COLORS = {
  // Primary colors
  primary: '#222222',
  primaryHover: '#000000',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Background colors
  bgWhite: '#ffffff',
  bgLight: '#f9fafb',
  bgGray: '#f3f4f6',
  
  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  
  // Status colors
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.08)',
  successBgSolid: 'rgba(16, 185, 129, 0.12)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.08)',
  
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.08)',
  
  info: '#5086E8',
  infoBg: 'rgba(80, 134, 232, 0.08)',
  
  neutral: '#6b7280',
  neutralBg: 'rgba(107, 114, 128, 0.08)',
  
  // Price color
  price: '#059669'
};

// ==================== TYPOGRAPHY ====================
export const TYPOGRAPHY = {
  // Font family
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  
  // Font sizes
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px'
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
};

// ==================== SPACING ====================
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px'
};

// ==================== BORDER RADIUS ====================
export const BORDER_RADIUS = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px'
};

// ==================== SHADOWS ====================
export const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 24px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 32px rgba(0, 0, 0, 0.18)'
};

// ==================== BUTTON STYLES ====================
export const BUTTON_STYLES = {
  // Primary button (black)
  primary: {
    background: COLORS.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    padding: '10px 20px',
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    cursor: 'pointer',
    transition: 'background 0.15s'
  },
  primaryHover: {
    background: COLORS.primaryHover
  },
  
  // Secondary button (outline)
  secondary: {
    background: 'transparent',
    color: COLORS.textPrimary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: BORDER_RADIUS.lg,
    padding: '10px 20px',
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  secondaryHover: {
    background: COLORS.bgGray
  },
  
  // Success button (green)
  success: {
    background: COLORS.success,
    color: '#ffffff',
    border: 'none',
    borderRadius: BORDER_RADIUS.lg,
    padding: '10px 20px',
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    cursor: 'pointer'
  },
  
  // Danger button (red)
  danger: {
    background: 'transparent',
    color: COLORS.error,
    border: `1px solid ${COLORS.error}`,
    borderRadius: BORDER_RADIUS.lg,
    padding: '10px 20px',
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    cursor: 'pointer'
  },
  dangerHover: {
    background: COLORS.errorBg
  }
};

// ==================== MODAL STYLES ====================
export const MODAL_STYLES = {
  // Overlay
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },
  
  // Modal container
  container: {
    background: COLORS.bgWhite,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    maxWidth: '440px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: SHADOWS.lg
  },
  
  // Modal header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${COLORS.border}`
  },
  
  // Modal title
  title: {
    margin: 0,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary
  },
  
  // Close button (X)
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: COLORS.textSecondary,
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    transition: 'all 0.15s',
    lineHeight: 1
  },
  closeButtonHover: {
    background: COLORS.bgGray,
    color: COLORS.textPrimary
  },
  
  // Modal content
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  },
  
  // Modal footer
  footer: {
    padding: '16px 20px',
    borderTop: `1px solid ${COLORS.border}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  }
};

// ==================== STATUS BADGE STYLES ====================
export const STATUS_BADGE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: BORDER_RADIUS.full,
  fontSize: TYPOGRAPHY.fontSize.sm,
  fontWeight: TYPOGRAPHY.fontWeight.medium
};

// ==================== FORM INPUT STYLES ====================
export const INPUT_STYLES = {
  base: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: BORDER_RADIUS.lg,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
    background: COLORS.bgWhite,
    outline: 'none',
    transition: 'border-color 0.15s'
  },
  focus: {
    borderColor: COLORS.primary
  },
  error: {
    borderColor: COLORS.error
  }
};

// ==================== LABEL STYLES ====================
export const LABEL_STYLES = {
  base: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginBottom: '4px'
  }
};

// ==================== CARD STYLES ====================
export const CARD_STYLES = {
  base: {
    background: COLORS.bgWhite,
    borderRadius: BORDER_RADIUS.xl,
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden'
  },
  hover: {
    boxShadow: SHADOWS.md
  }
};

/**
 * Helper function to merge styles
 */
export function mergeStyles(...styles) {
  return Object.assign({}, ...styles);
}

/**
 * Helper to get status badge style with color
 */
export function getStatusBadgeStyle(color, bg, borderStyle = 'solid') {
  return {
    ...STATUS_BADGE_STYLE,
    background: bg,
    color: color,
    border: `1px ${borderStyle} ${color}`
  };
}
