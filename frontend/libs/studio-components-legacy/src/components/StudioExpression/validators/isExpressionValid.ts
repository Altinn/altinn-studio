import type { Expression } from '../types/Expression';
import Ajv from 'ajv';
import expressionSchema from './expression.schema.v1.json';

export const isExpressionValid = (expression: unknown): expression is Expression => {
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile<Expression>(expressionSchema);
  return validate(expression);
};
