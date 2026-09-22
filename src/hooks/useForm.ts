import { useState, useCallback, ChangeEvent, FocusEvent, FormEvent } from 'react';

export interface ValidationRules {
  [key: string]: {
    required?: boolean;
    requiredMessage?: string;
    email?: boolean;
    emailMessage?: string;
    minLength?: number;
    minLengthMessage?: string;
    maxLength?: number;
    maxLengthMessage?: string;
    pattern?: RegExp;
    patternMessage?: string;
    matchField?: string;
    matchFieldMessage?: string;
    mustBeTrue?: boolean;
    mustBeTrueMessage?: string;
    custom?: (value: unknown, allValues: Record<string, unknown>) => string | null;
  };
}

export interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: ValidationRules;
  onSubmit: (values: T) => void | Promise<void>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationRules = {},
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core field validation function
  const validateField = useCallback(
    (name: keyof T, value: unknown, allValues: T): string => {
      const rule = validationRules[name as string];
      if (!rule) return '';

      // Check required
      if (rule.required) {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          return rule.requiredMessage || 'Este campo es obligatorio';
        }
      }

      // Check mustBeTrue (e.g. Terms & Conditions checkbox)
      if (rule.mustBeTrue) {
        if (value !== true) {
          return rule.mustBeTrueMessage || 'Debes aceptar este campo para continuar';
        }
      }

      // Skip subsequent validations if value is empty and not required
      if (!rule.required && (value === undefined || value === null || value === '')) {
        return '';
      }

      // Check Email
      if (rule.email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(String(value))) {
          return rule.emailMessage || 'Introduce un correo electrónico válido';
        }
      }

      // Check Min Length
      if (rule.minLength && String(value).length < rule.minLength) {
        return (
          rule.minLengthMessage ||
          `Este campo debe tener al menos ${rule.minLength} caracteres`
        );
      }

      // Check Max Length
      if (rule.maxLength && String(value).length > rule.maxLength) {
        return (
          rule.maxLengthMessage ||
          `Este campo no debe superar los ${rule.maxLength} caracteres`
        );
      }

      // Check Match Field (e.g. Password Confirmation)
      if (rule.matchField) {
        const matchValue = allValues[rule.matchField];
        if (value !== matchValue) {
          return rule.matchFieldMessage || 'Los campos no coinciden';
        }
      }

      // Check Pattern Regex
      if (rule.pattern && !rule.pattern.test(String(value))) {
        return rule.patternMessage || 'El formato introducido no es válido';
      }

      // Check Custom Validation
      if (rule.custom) {
        const customError = rule.custom(value, allValues);
        if (customError) {
          return customError;
        }
      }

      return '';
    },
    [validationRules]
  );

  // Validate all fields in the form and return the complete errors object
  const validateForm = useCallback(
    (currentValues: T): Partial<Record<keyof T, string>> => {
      const newErrors: Partial<Record<keyof T, string>> = {};
      Object.keys(validationRules).forEach((key) => {
        const value = currentValues[key as keyof T];
        const error = validateField(key as keyof T, value, currentValues);
        if (error) {
          newErrors[key as keyof T] = error;
        }
      });
      return newErrors;
    },
    [validateField, validationRules]
  );

  // Handles input changes (text, checkbox, etc.)
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, type, value } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      
      const val = type === 'checkbox' ? checked : value;
      
      setValues((prev) => {
        const updated = { ...prev, [name]: val };
        
        // Real-time validation if the field has been touched
        if (touched[name as keyof T]) {
          const fieldError = validateField(name as keyof T, val, updated);
          setErrors((prevErrors) => ({
            ...prevErrors,
            [name]: fieldError,
          }));
        }
        
        return updated;
      });
    },
    [touched, validateField]
  );

  // Handles input blur event (marks field as touched and validates)
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, type, value } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      const val = type === 'checkbox' ? checked : value;

      setTouched((prev) => ({ ...prev, [name]: true }));
      
      const fieldError = validateField(name as keyof T, val, values);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError,
      }));
    },
    [values, validateField]
  );

  // Handle Form Submission
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched to trigger full error visibility
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      Object.keys(validationRules).forEach((key) => {
        allTouched[key as keyof T] = true;
      });
      setTouched(allTouched);

      // Validate all fields
      const newErrors = validateForm(values);
      setErrors(newErrors);

      const hasErrors = Object.values(newErrors).some((error) => !!error);

      if (!hasErrors) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Error submitting form:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validationRules, validateForm, onSubmit]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      setValues((prev) => {
        const updated = { ...prev, [name]: value };
        if (touched[name]) {
          const fieldError = validateField(name, value, updated);
          setErrors((prevErrors) => ({ ...prevErrors, [name]: fieldError }));
        }
        return updated;
      });
    },
    [touched, validateField]
  );

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
    if (isTouched) {
      const fieldError = validateField(name, values[name], values);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  }, [values, validateField]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    isValid: Object.keys(validateForm(values)).length === 0,
  };
}
