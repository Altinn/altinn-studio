import type { Expression } from '../types/Expression';
import Ajv from 'ajv';
import expressionSchema from '@app/layout-contract/schemas/json/layout/expression.schema.v1.json';

// Gateway actions are Designer expressions; the app runtime does not evaluate them.
const designerExpressionSchema = {
  ...expressionSchema,
  definitions: {
    ...expressionSchema.definitions,
    'func-gatewayAction': {
      title: 'Gateway action lookup function',
      description: 'This function will look up a value in the gateway action',
      type: 'array',
      items: [{ const: 'gatewayAction' }],
    },
    'strict-string': {
      ...expressionSchema.definitions['strict-string'],
      anyOf: [
        ...expressionSchema.definitions['strict-string'].anyOf,
        { $ref: '#/definitions/func-gatewayAction' },
      ],
    },
  },
};

export const isExpressionValid = (expression: unknown): expression is Expression => {
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile<Expression>(designerExpressionSchema);
  return validate(expression);
};
