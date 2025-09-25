import type { Expression } from '../types/Expression';

export const stringToExpression = (str: string): Expression => {
  const expression = JSON.parse(str);
  return expression as Expression;
};
