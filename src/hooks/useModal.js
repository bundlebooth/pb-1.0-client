/**
 * Shared Modal Hooks for Planbeau
 * Reusable hooks for modal and dialog patterns
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * useModal - Generic modal state management
 * @param {boolean} initialOpen - Initial open state
 * @returns {Object} Modal state and handlers
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow close animation
    setTimeout(() => setData(null), 200);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData
  };
}

/**
 * useConfirmModal - Confirmation dialog hook
 * @returns {Object} Confirm modal state and handlers
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Confirm',
    message: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default', // 'default', 'danger', 'warning'
    onConfirm: null,
    onCancel: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          setIsOpen(false);
          resolve(true);
        },
        onCancel: () => {
          setIsOpen(false);
          resolve(false);
        }
      });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (config.onConfirm) {
      setIsLoading(true);
      try {
        await config.onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
  }, [config]);

  const handleCancel = useCallback(() => {
    if (config.onCancel) {
      config.onCancel();
    }
  }, [config]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    config,
    isLoading,
    confirm,
    handleConfirm,
    handleCancel,
    close
  };
}

/**
 * useActionMenu - Dropdown action menu hook
 * @returns {Object} Action menu state and handlers
 */
export function useActionMenu() {
  const [openMenuId, setOpenMenuId] = useState(null);

  const openMenu = useCallback((id) => {
    setOpenMenuId(id);
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  const toggleMenu = useCallback((id) => {
    setOpenMenuId(prev => prev === id ? null : id);
  }, []);

  const isMenuOpen = useCallback((id) => {
    return openMenuId === id;
  }, [openMenuId]);

  // Close menu when clicking outside
  useEffect(() => {
    if (openMenuId === null) return;

    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    // Use setTimeout to avoid immediate close on the same click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  return {
    openMenuId,
    openMenu,
    closeMenu,
    toggleMenu,
    isMenuOpen
  };
}

/**
 * useDrawer - Side drawer/panel hook
 * @param {string} position - 'left' or 'right'
 * @returns {Object} Drawer state and handlers
 */
export function useDrawer(position = 'right') {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(null);

  const open = useCallback((drawerContent = null) => {
    setContent(drawerContent);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setContent(null), 300);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return {
    isOpen,
    content,
    position,
    open,
    close,
    setContent
  };
}

/**
 * useToast - Toast notification hook
 * @returns {Object} Toast state and handlers
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, options = {}) => {
    const id = Date.now();
    const toast = {
      id,
      message,
      type: options.type || 'info', // 'info', 'success', 'warning', 'error'
      duration: options.duration || 5000,
      action: options.action || null
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options) => {
    return addToast(message, { ...options, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, options) => {
    return addToast(message, { ...options, type: 'error' });
  }, [addToast]);

  const warning = useCallback((message, options) => {
    return addToast(message, { ...options, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message, options) => {
    return addToast(message, { ...options, type: 'info' });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  };
}

/**
 * useSelection - Multi-select state management
 * @param {Array} items - Array of items with id field
 * @returns {Object} Selection state and handlers
 */
export function useSelection(items = []) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const select = useCallback((id) => {
    setSelectedIds(prev => new Set([...prev, id]));
  }, []);

  const deselect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, items.length, selectAll, deselectAll]);

  const isSelected = useCallback((id) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectedItems = items.filter(item => selectedIds.has(item.id));
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    allSelected,
    someSelected,
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    toggleAll,
    isSelected,
    setSelectedIds
  };
}
