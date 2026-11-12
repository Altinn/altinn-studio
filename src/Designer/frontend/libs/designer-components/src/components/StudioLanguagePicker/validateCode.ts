export interface ErrorMessages {
  empty: string;
  codeExists: string;
}

export interface ValidationContext {
  existingCodes: string[];
}

export function validateCode(
  code: string,
  context: ValidationContext,
  errorMessages: ErrorMessages,
): string {
  if (!code.length) {
    return errorMessages.empty;
  } else if (context.existingCodes.includes(code)) {
    return errorMessages.codeExists;
  } else {
    return '';
  }
}
