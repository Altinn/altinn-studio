import { BranchNameValidator } from './BranchNameValidator';

describe('BranchNameValidator', () => {
  describe('validate', () => {
    describe('empty or null branch names', () => {
      it('should reject empty string', () => {
        const result = BranchNameValidator.validate('');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_empty');
      });

      it('should reject branch name with only whitespace', () => {
        const result = BranchNameValidator.validate('   ');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });
    });

    describe('invalid characters', () => {
      it('should reject branch name with spaces', () => {
        const result = BranchNameValidator.validate('feature branch');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with tilde (~)', () => {
        const result = BranchNameValidator.validate('feature~test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with caret (^)', () => {
        const result = BranchNameValidator.validate('feature^test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with colon (:)', () => {
        const result = BranchNameValidator.validate('feature:test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with question mark (?)', () => {
        const result = BranchNameValidator.validate('feature?test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with asterisk (*)', () => {
        const result = BranchNameValidator.validate('feature*test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with square brackets ([])', () => {
        const result = BranchNameValidator.validate('feature[test]');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with backslash (\\)', () => {
        const result = BranchNameValidator.validate('feature\\test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with at sign (@)', () => {
        const result = BranchNameValidator.validate('feature@test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });

      it('should reject branch name with curly braces ({})', () => {
        const result = BranchNameValidator.validate('feature{test}');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_chars');
      });
    });

    describe('invalid patterns', () => {
      it('should reject branch name with double dots (..)', () => {
        const result = BranchNameValidator.validate('feature..test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_pattern');
      });

      it('should reject branch name with double slashes (//)', () => {
        const result = BranchNameValidator.validate('feature//test');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_pattern');
      });

      it('should reject branch name starting with slash', () => {
        const result = BranchNameValidator.validate('/feature');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_pattern');
      });

      it('should reject branch name ending with slash', () => {
        const result = BranchNameValidator.validate('feature/');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_invalid_pattern');
      });
    });

    describe('reserved endings', () => {
      it('should reject branch name ending with .lock', () => {
        const result = BranchNameValidator.validate('feature.lock');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_reserved_ending');
      });

      it('should reject branch name with .lock anywhere in path', () => {
        const result = BranchNameValidator.validate('feature/test.lock');
        expect(result.isValid).toBe(false);
        expect(result.errorKey).toBe('create_branch.error_reserved_ending');
      });
    });

    describe('valid branch names', () => {
      it('should accept simple branch name', () => {
        const result = BranchNameValidator.validate('main');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept branch name with slash', () => {
        const result = BranchNameValidator.validate('feature/test');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept branch name with hyphens', () => {
        const result = BranchNameValidator.validate('feature-test-123');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept branch name with underscores', () => {
        const result = BranchNameValidator.validate('feature_test_123');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept branch name with numbers', () => {
        const result = BranchNameValidator.validate('feature123');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept branch name with dots (not consecutive)', () => {
        const result = BranchNameValidator.validate('feature.1.0');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept nested branch name', () => {
        const result = BranchNameValidator.validate('feature/sub-feature/test');
        expect(result.isValid).toBe(true);
        expect(result.errorKey).toBe('');
      });

      it('should accept conventional branch names', () => {
        const conventionalNames = [
          'feature/add-login',
          'bugfix/fix-validation',
          'hotfix/critical-bug',
          'release/v1.0.0',
          'develop',
          'main',
          'master',
        ];

        conventionalNames.forEach((name) => {
          const result = BranchNameValidator.validate(name);
          expect(result.isValid).toBe(true);
          expect(result.errorKey).toBe('');
        });
      });
    });
  });

  describe('isValid', () => {
    it('should return true for valid branch name', () => {
      expect(BranchNameValidator.isValid('feature/test')).toBe(true);
    });

    it('should return false for invalid branch name', () => {
      expect(BranchNameValidator.isValid('feature:test')).toBe(false);
    });

    it('should return false for empty branch name', () => {
      expect(BranchNameValidator.isValid('')).toBe(false);
    });
  });
});
