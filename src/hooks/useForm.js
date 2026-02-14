/**
 * Shared Form Hooks for Planbeau
 * Reusable hooks for form handling patterns
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * useForm - Generic form handling hook
 * Handles form state, validation, and submission
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 */
export function useForm(initialValues = {}, options = {}) {
  const {
    validate,
    onSubmit,
    validateOnChange = false,
    validateOnBlur = true
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Validate a single field
  const validateField = useCallback((name, value) => {
    if (!validate) return null;
    const allErrors = validate({ ...values, [name]: value });
    return allErrors[name] || null;
  }, [validate, values]);

  // Validate all fields
  const validateForm = useCallback(() => {
    if (!validate) return {};
    const formErrors = validate(values);
    setErrors(formErrors);
    return formErrors;
  }, [validate, values]);

  // Handle field change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    if (validateOnChange && validate) {
      const fieldError = validateField(name, newValue);
      setErrors(prev => {
        if (fieldError) {
          return { ...prev, [name]: fieldError };
        }
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [validateOnChange, validate, validateField]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (validateOnBlur && validate) {
      const fieldError = validateField(name, value);
      setErrors(prev => {
        if (fieldError) {
          return { ...prev, [name]: fieldError };
        }
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [validateOnBlur, validate, validateField]);

  // Set a single field value
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Set a single field error
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Set a field as touched
  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    setSubmitError(null);
    
    // Validate all fields
    const formErrors = validateForm();
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // If there are errors, don't submit
    if (Object.keys(formErrors).length > 0) {
      return { success: false, errors: formErrors };
    }
    
    // Call onSubmit if provided
    if (onSubmit) {
      try {
        setIsSubmitting(true);
        const result = await onSubmit(values);
        return { success: true, data: result };
      } catch (error) {
        setSubmitError(error.message);
        return { success: false, error: error.message };
      } finally {
        setIsSubmitting(false);
      }
    }
    
    return { success: true, values };
  }, [values, validateForm, onSubmit]);

  // Reset form to initial values
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitError(null);
  }, [initialValues]);

  // Set multiple values at once
  const setMultipleValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  // Get field props for easy binding
  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur
  }), [values, handleChange, handleBlur]);

  // Get field meta (error, touched state)
  const getFieldMeta = useCallback((name) => ({
    error: errors[name],
    touched: touched[name],
    hasError: touched[name] && errors[name]
  }), [errors, touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    isDirty,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    setMultipleValues,
    setErrors,
    reset,
    getFieldProps,
    getFieldMeta,
    validateForm,
    validateField
  };
}

/**
 * useFormField - Hook for a single form field
 */
export function useFormField(initialValue = '', validator) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback(() => {
    if (validator) {
      const fieldError = validator(value);
      setError(fieldError);
      return !fieldError;
    }
    return true;
  }, [value, validator]);

  const handleChange = useCallback((e) => {
    const newValue = e.target ? e.target.value : e;
    setValue(newValue);
    if (touched && validator) {
      setError(validator(newValue));
    }
  }, [touched, validator]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  const reset = useCallback((newValue = initialValue) => {
    setValue(newValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    error,
    touched,
    hasError: touched && error,
    setValue,
    setError,
    handleChange,
    handleBlur,
    validate,
    reset,
    props: {
      value,
      onChange: handleChange,
      onBlur: handleBlur
    }
  };
}

/**
 * Common validators
 */
export const validators = {
  required: (message = 'This field is required') => (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },

  email: (message = 'Invalid email address') => (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : message;
  },

  minLength: (min, message) => (value) => {
    if (!value) return null;
    return value.length >= min ? null : (message || `Must be at least ${min} characters`);
  },

  maxLength: (max, message) => (value) => {
    if (!value) return null;
    return value.length <= max ? null : (message || `Must be at most ${max} characters`);
  },

  pattern: (regex, message = 'Invalid format') => (value) => {
    if (!value) return null;
    return regex.test(value) ? null : message;
  },

  phone: (message = 'Invalid phone number') => (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(value) ? null : message;
  },

  url: (message = 'Invalid URL') => (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  number: (message = 'Must be a number') => (value) => {
    if (!value && value !== 0) return null;
    return !isNaN(Number(value)) ? null : message;
  },

  min: (minValue, message) => (value) => {
    if (!value && value !== 0) return null;
    return Number(value) >= minValue ? null : (message || `Must be at least ${minValue}`);
  },

  max: (maxValue, message) => (value) => {
    if (!value && value !== 0) return null;
    return Number(value) <= maxValue ? null : (message || `Must be at most ${maxValue}`);
  },

  match: (fieldName, message) => (value, allValues) => {
    if (!value) return null;
    return value === allValues[fieldName] ? null : (message || `Must match ${fieldName}`);
  },

  compose: (...validators) => (value, allValues) => {
    for (const validator of validators) {
      const error = validator(value, allValues);
      if (error) return error;
    }
    return null;
  }
};

/**
 * useMultiStep - Hook for multi-step forms
 */
export function useMultiStep(steps, initialStep = 0) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const goToStep = useCallback((step) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    if (!isLastStep) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, currentStep]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  const markStepComplete = useCallback((step = currentStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, [currentStep]);

  const isStepComplete = useCallback((step) => {
    return completedSteps.has(step);
  }, [completedSteps]);

  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps(new Set());
  }, [initialStep]);

  return {
    currentStep,
    currentStepData,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    markStepComplete,
    isStepComplete,
    reset
  };
}
