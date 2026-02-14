/**
 * Common Components Index
 * Centralized exports for all reusable UI components
 */

export { default as LoadingSpinner, LoadingState, SkeletonLine, SkeletonCard } from './LoadingSpinner';

export { default as Button, IconButton, ButtonGroup, ActionButtons } from './Button';

export {
  FormGroup,
  FormRow,
  FormLabel,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  FormRadioGroup,
  FormSection,
  DetailRow,
  DetailSection,
  WarningBox,
  FormField,
  FormSelectField,
  FormTextareaField,
  ImageUploadField,
  ToggleSwitch,
  PriceInput
} from './FormComponents';

// UI Components (new shared components)
export {
  // Buttons
  Button as UIButton,
  IconButton as UIIconButton,
  ButtonGroup as UIButtonGroup,
  
  // Action Buttons (Edit/Delete/View icons)
  ActionButton as IconActionButton,
  ActionButtonGroup,
  EditButton,
  DeleteButton,
  ViewButton,
  
  // Loading & Empty States
  Spinner,
  LoadingState as UILoadingState,
  EmptyState as UIEmptyState,
  
  // Badges & Tags
  Badge,
  StatusBadge as UIStatusBadge,
  Tag,
  
  // Cards
  Card as UICard,
  StatsCard as UIStatsCard,
  
  // Form Elements
  FormGroup as UIFormGroup,
  Input,
  Textarea,
  Select,
  
  // Navigation
  TabNav as UITabNav,
  Breadcrumb,
  
  // Layout
  Divider,
  Flex,
  Grid,
  
  // Typography
  Heading,
  Text,
  
  // Alerts & Notifications
  Alert,
  
  // Avatar
  Avatar,
  AvatarGroup,
  
  // Tooltip
  Tooltip
} from './UIComponents';

// Dashboard Components
export {
  BookingCard,
  BookingList,
  MessageItem,
  ConversationItem,
  ReviewCard,
  StarRating,
  InvoiceCard,
  StatsGrid,
  StatCard,
  DashboardLoading,
  DashboardEmpty,
  DashboardTabs,
  DashboardFilterBar,
  ActionMenu,
  DashboardSectionHeader
} from './DashboardComponents';

// Inline Field Validation
export {
  default as InlineFieldValidation,
  ValidationErrorBanner,
  FieldError,
  InputWrapper,
  RequiredIndicator,
  getErrorStyle,
  useFieldValidation
} from './InlineFieldValidation';

// Centralized App Icons
export { Icons, Icon, IconClasses } from './AppIcons';
