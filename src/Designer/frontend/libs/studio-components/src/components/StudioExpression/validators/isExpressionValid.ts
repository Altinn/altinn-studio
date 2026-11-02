import type { Expression } from '../types/Expression';
import Ajv, { type ValidateFunction } from 'ajv';
import expressionSchema from '@app/layout-contract/schemas/json/layout/expression.schema.v1.json';

// Compiling the schema is slow, and StudioExpression validates on every render. Compile it once, on first use rather
// than on import, so that importing @studio/components does not pay for it.
let validate: ValidateFunction<Expression> | undefined;

export const isExpressionValid = (expression: unknown): expression is Expression => {
  validate ??= new Ajv({ strict: false }).compile<Expression>(expressionSchema);
  return validate(expression);
};
