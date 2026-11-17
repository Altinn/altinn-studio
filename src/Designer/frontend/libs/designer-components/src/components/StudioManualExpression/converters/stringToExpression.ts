import type { Expression } from '../../StudioExpression/types/Expression';

export const stringToExpression = (str: string): Expression => {
  const expression = JSON.parse(str);
  return expression as Expression;
};
