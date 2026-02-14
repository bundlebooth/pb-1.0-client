/**
 * Centralized Hooks Export for Planbeau
 * Import all custom hooks from this file for cleaner imports
 */

// API Hooks
export {
  useApiData,
  useApiMutation,
  useVendorProfile,
  usePagination,
  useDebounce,
  useLocalStorage,
  useClickOutside,
  useToggle,
  useAsync
} from './useApi';

// Form Hooks
export {
  useForm,
  useFormField,
  useMultiStep,
  validators
} from './useForm';

// Modal & UI Hooks
export {
  useModal,
  useConfirmModal,
  useActionMenu,
  useDrawer,
  useToast,
  useSelection
} from './useModal';

// Re-export existing hooks
export { useNotifications } from './useNotifications';
export { useOnlineStatus, useUserOnlineStatus, useVendorOnlineStatus } from './useOnlineStatus';
