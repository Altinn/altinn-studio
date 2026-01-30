import { GIT_BRANCH_VALIDATION } from 'app-shared/constants';

export interface ValidationResult {
  isValid: boolean;
  errorKey: string;
}

export class BranchNameValidator {
  public static validate(name: string): ValidationResult {
    if (!name || name.length === 0) {
      return { isValid: false, errorKey: 'branching.new_branch_dialog.error_empty' };
    }

    if (GIT_BRANCH_VALIDATION.INVALID_CHARS.test(name)) {
      return { isValid: false, errorKey: 'branching.new_branch_dialog.error_invalid_chars' };
    }

    if (GIT_BRANCH_VALIDATION.INVALID_PATTERNS.test(name)) {
      return { isValid: false, errorKey: 'branching.new_branch_dialog.error_invalid_pattern' };
    }

    if (GIT_BRANCH_VALIDATION.RESERVED_ENDING.test(name)) {
      return { isValid: false, errorKey: 'branching.new_branch_dialog.error_reserved_ending' };
    }

    return { isValid: true, errorKey: '' };
  }

  public static isValid(name: string): boolean {
    return this.validate(name).isValid;
  }
}
