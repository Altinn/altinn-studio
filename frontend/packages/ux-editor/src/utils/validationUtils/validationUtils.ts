export interface Validation {
  required?: {
    message: string;
  };
  valueAsNumber?: {
    message: string;
  };
  valueAsUrl?: {
    message: string;
  };
}

export const validate = (
  validation: Validation,
  inputValue: string
): { error: string | undefined } => {
  if (validation.required) {
    const isInvalid = !inputValue;
    if (isInvalid) {
      return { error: validation.required.message };
    }
  }

  if (validation.valueAsNumber) {
    const allowEmptyField = !validation.required;
    const isInvalid = allowEmptyField && !inputValue ? false : isNaN(parseInt(inputValue, 10));
    if (isInvalid) {
      return { error: validation.valueAsNumber.message };
    }
  }

  if (validation.valueAsUrl) {
    try {
      // new url throws if the provided input does not match the format of a valid url.
      new URL(inputValue);
    } catch {
      return { error: validation.valueAsUrl.message };
    }
  }
  return { error: undefined };
};
