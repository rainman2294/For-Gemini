import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const { toast } = useToast();

  // Common validation patterns
  const patterns = {
    url: /^https?:\/\/.+/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^\+?[\d\s-()]+$/,
    alphanumeric: /^[a-zA-Z0-9\s]+$/,
  };

  // Pre-defined validation rules
  const commonRules = {
    required: (message = 'This field is required'): ValidationRule => ({
      required: true,
      message,
    }),
    url: (message = 'Please enter a valid URL (starting with http:// or https://)'): ValidationRule => ({
      pattern: patterns.url,
      message,
    }),
    email: (message = 'Please enter a valid email address'): ValidationRule => ({
      pattern: patterns.email,
      message,
    }),
    minLength: (length: number, message?: string): ValidationRule => ({
      minLength: length,
      message: message || `Must be at least ${length} characters long`,
    }),
    maxLength: (length: number, message?: string): ValidationRule => ({
      maxLength: length,
      message: message || `Must be no more than ${length} characters long`,
    }),
    password: (message = 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters'): ValidationRule[] => [
      { required: true, message: 'Password is required' },
      { minLength: 8, message: 'Password must be at least 8 characters long' },
      {
        custom: (value: string) => {
          const hasUppercase = /[A-Z]/.test(value);
          const hasLowercase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(value);
          const complexity = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
          return complexity >= 3;
        },
        message,
      },
    ],
  };

  const validateField = useCallback((value: string, rules: ValidationRule[]): string | null => {
    for (const rule of rules) {
      // Required validation
      if (rule.required && (!value || value.trim().length === 0)) {
        return rule.message;
      }

      // Skip other validations if field is empty and not required
      if (!value || value.trim().length === 0) {
        continue;
      }

      // Length validations
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return rule.message;
      }

      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        return rule.message;
      }
    }

    return null;
  }, []);

  const validateForm = useCallback((data: Record<string, string>, rules: ValidationRules): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach((fieldName) => {
      const fieldValue = data[fieldName] || '';
      const fieldRules = rules[fieldName];
      const error = validateField(fieldValue, fieldRules);

      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField]);

  const validateSingleField = useCallback((fieldName: string, value: string, rules: ValidationRule[]): boolean => {
    const error = validateField(value, rules);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || '',
    }));

    return !error;
  }, [validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const showValidationToast = useCallback((message: string) => {
    toast({
      title: 'Validation Error',
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  const showSuccessToast = useCallback((message: string) => {
    toast({
      title: 'Success',
      description: message,
      variant: 'default',
    });
  }, [toast]);

  return {
    errors,
    validateForm,
    validateSingleField,
    validateField,
    clearErrors,
    clearFieldError,
    showValidationToast,
    showSuccessToast,
    commonRules,
    patterns,
  };
};