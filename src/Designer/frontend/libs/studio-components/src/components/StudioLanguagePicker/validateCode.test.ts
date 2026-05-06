import type { ErrorMessages, ValidationContext } from './validateCode';
import { validateCode } from './validateCode';
import { twoLetterCodes } from './test-data/props';

// Test data:
const errorMessages: ErrorMessages = { empty: 'Empty', codeExists: 'Code exists' };
const context: ValidationContext = { existingCodes: twoLetterCodes };

describe('validateCode', () => {
  it('Returns an empty string when there are no errors', () => {
    expect(validateCode('fr', context, errorMessages)).toEqual('');
  });

  it('Returns the empty error message when the code list is empty', () => {
    expect(validateCode('', context, errorMessages)).toEqual(errorMessages.empty);
  });

  it('Returns the code exists error message when the code already exists', () => {
    expect(validateCode(twoLetterCodes[0], context, errorMessages)).toEqual(
      errorMessages.codeExists,
    );
  });
});
