import { GIT_BRANCH_VALIDATION } from 'app-shared/constants/gitBranchValidation';
import { StringUtils } from '@studio/pure-functions';

export interface ValidationResult {
  isValid: boolean;
  errorKey: string;
}

export class BranchNameValidator {
  public static validate(name: string, existingNames: string[] = []): ValidationResult {
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

    if (this.alreadyExists(name, existingNames)) {
      return { isValid: false, errorKey: 'branching.new_branch_dialog.error_already_exists' };
    }

    return { isValid: true, errorKey: '' };
  }

  private static alreadyExists(name: string, existingNames: string[]): boolean {
    return existingNames.some((existingName) =>
      StringUtils.areCaseInsensitiveEqual(existingName, name),
    );
  }
}
