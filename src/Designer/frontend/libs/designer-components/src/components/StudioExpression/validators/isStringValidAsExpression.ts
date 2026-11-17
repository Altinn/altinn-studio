import { isExpressionValid } from './isExpressionValid';

export const isStringValidAsExpression = (str: string): boolean => {
  try {
    const expression = JSON.parse(str);
    return isExpressionValid(expression);
  } catch {
    return false;
  }
};
