// ============================================
// OFFER VALIDATION
// ============================================

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  general?: string;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Validate customer info for offer submission
 */
export function validateCustomerInfo(info: CustomerInfo): ValidationErrors {
  const errors: ValidationErrors = {};

  // First Name
  if (!info.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }

  // Last Name
  if (!info.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!info.email?.trim() || !emailRegex.test(info.email)) {
    errors.email = 'Valid email is required';
  }

  // Phone
  const phoneRegex = /^\d{10,}$/;
  const cleanPhone = info.phone?.replace(/\D/g, '') || '';
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    errors.phone = 'Valid phone number is required';
  }

  return errors;
}

/**
 * Check if validation passed
 */
export function isValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
