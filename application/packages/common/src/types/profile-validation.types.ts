/**
 * Defines the type of check to perform for a validation rule.
 * - existsAndNotEmptyString: Checks if the value exists, is a string, and is not empty after trimming.
 * - arrayNotEmpty: Checks if the value exists, is an array, and has length > 0.
 */
export type ValidationCheckType = 'existsAndNotEmptyString' | 'arrayNotEmpty';

/**
 * Represents a single validation rule for the user profile.
 */
export interface ValidationRule {
    /** The dot-separated path to the value in the ProfileData object (e.g., 'personal.name', 'roles'). */
    path: string; 
    /** The type of check to perform on the value found at the path. */
    checkType: ValidationCheckType; 
    /** The user-friendly hint to display if the validation fails. */
    hint: string; 
    // Options can be added later for checks like minLength, pattern matching etc.
    // options?: { minLength?: number; pattern?: RegExp }; 
}

/**
 * The result of validating a profile against a set of rules.
 */
export interface ProfileValidationResult {
    /** True if all validation rules passed, false otherwise. */
    isComplete: boolean;
    /** A list of user-friendly hints for the rules that failed. */
    hints: string[];
} 