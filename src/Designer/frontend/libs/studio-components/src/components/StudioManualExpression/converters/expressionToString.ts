import type { Expression } from '../../StudioExpression/types/Expression';

export const expressionToString = (expression: Expression): string =>
  JSON.stringify(expression, null, 2);
