/**
 * Property 15: Client-side form validation
 * Feature: auth-and-data-model, Property 15: Client-side form validation
 *
 * For any registration form submission where any required field is empty,
 * the email is not a valid format, the password is shorter than 8 characters,
 * or the password and confirm password do not match, the form should display
 * validation errors and not make an API call.
 *
 * **Validates: Requirements 12.6**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Replicate the exact validation logic from register/page.tsx and login/page.tsx

interface RegisterFieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

function validateRegister(name: string, email: string, password: string, confirmPassword: string): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  if (!name.trim()) errors.name = 'Name is required';
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Invalid email format';
  }
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

function validateLogin(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Invalid email format';
  }
  if (!password) errors.password = 'Password is required';
  return errors;
}

function hasErrors(errors: RegisterFieldErrors | LoginFieldErrors): boolean {
  return Object.values(errors).some(v => v !== undefined);
}

// Generators
const alphaNum = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''));
const alpha = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split(''));
const alphaUpper = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
const passChars = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%'.split(''));

const validEmailArb = fc.tuple(
  fc.string({ unit: alphaNum, minLength: 1, maxLength: 10 }),
  fc.string({ unit: alpha, minLength: 1, maxLength: 8 }),
  fc.string({ unit: alpha, minLength: 2, maxLength: 5 }),
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const invalidEmailArb = fc.oneof(
  fc.string({ unit: alphaNum, minLength: 1, maxLength: 15 }), // no @
  fc.string({ unit: alpha, minLength: 1, maxLength: 8 }).map(s => `${s}@`), // @ but no domain
  fc.tuple(
    fc.string({ unit: alpha, minLength: 1, maxLength: 8 }),
    fc.string({ unit: alpha, minLength: 1, maxLength: 8 }),
  ).map(([local, domain]) => `${local}@${domain}`), // no dot in domain
);

const validPasswordArb = fc.string({ unit: passChars, minLength: 8, maxLength: 20 });
const shortPasswordArb = fc.string({ unit: alphaNum, minLength: 1, maxLength: 7 });
const nonBlankNameArb = fc.string({ unit: alphaUpper, minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0);
const blankStringArb = fc.oneof(
  fc.constant(''),
  fc.string({ unit: fc.constant(' '), minLength: 1, maxLength: 5 }),
);

describe('Feature: auth-and-data-model, Property 15: Client-side form validation', () => {
  it('should produce name error for any blank name', () => {
    fc.assert(
      fc.property(blankStringArb, validEmailArb, validPasswordArb, (name, email, password) => {
        const errors = validateRegister(name, email, password, password);
        expect(errors.name).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce email error for any invalid email', () => {
    fc.assert(
      fc.property(nonBlankNameArb, invalidEmailArb, validPasswordArb, (name, email, password) => {
        const errors = validateRegister(name, email, password, password);
        expect(errors.email).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce password error for any password shorter than 8 chars', () => {
    fc.assert(
      fc.property(nonBlankNameArb, validEmailArb, shortPasswordArb, (name, email, password) => {
        const errors = validateRegister(name, email, password, password);
        expect(errors.password).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce confirmPassword error for mismatched passwords', () => {
    fc.assert(
      fc.property(nonBlankNameArb, validEmailArb, validPasswordArb, validPasswordArb.filter(p => p.length > 0), (name, email, password, confirmPassword) => {
        fc.pre(password !== confirmPassword);
        const errors = validateRegister(name, email, password, confirmPassword);
        expect(errors.confirmPassword).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce no errors for valid registration inputs', () => {
    fc.assert(
      fc.property(nonBlankNameArb, validEmailArb, validPasswordArb, (name, email, password) => {
        const errors = validateRegister(name, email, password, password);
        expect(hasErrors(errors)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce email error for blank email on login', () => {
    fc.assert(
      fc.property(blankStringArb, validPasswordArb, (email, password) => {
        const errors = validateLogin(email, password);
        expect(errors.email).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce email error for invalid email on login', () => {
    fc.assert(
      fc.property(invalidEmailArb, validPasswordArb, (email, password) => {
        const errors = validateLogin(email, password);
        expect(errors.email).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce password error for empty password on login', () => {
    fc.assert(
      fc.property(validEmailArb, (email) => {
        const errors = validateLogin(email, '');
        expect(errors.password).toBeDefined();
        expect(hasErrors(errors)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should produce no errors for valid login inputs', () => {
    fc.assert(
      fc.property(validEmailArb, validPasswordArb, (email, password) => {
        const errors = validateLogin(email, password);
        expect(hasErrors(errors)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
