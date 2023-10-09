import type { IExpressionValidations } from 'src/utils/validation/types';

export type ICustomValidationState = {
  customValidation: IExpressionValidations | null;
  error: Error | null;
};
