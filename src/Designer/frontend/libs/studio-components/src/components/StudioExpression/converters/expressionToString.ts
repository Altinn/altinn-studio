import type { Expression } from '../types/Expression';

export const expressionToString = (expression: Expression): string =>
  JSON.stringify(expression, null, 2);
