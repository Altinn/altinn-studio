import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';
import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';
import { ExprVal } from 'src/features/expressions/types';

const toTsMap: { [key in ExprVal]: string } = {
  [ExprVal.Any]: 'ExprValToActualOrExpr<ExprVal.Any>',
  [ExprVal.Boolean]: 'ExprValToActualOrExpr<ExprVal.Boolean>',
  [ExprVal.Number]: 'ExprValToActualOrExpr<ExprVal.Number>',
  [ExprVal.String]: 'ExprValToActualOrExpr<ExprVal.String>',
  [ExprVal.Date]: 'ExprValToActualOrExpr<ExprVal.Date>',
};

const toSchemaMap: { [key in ExprVal]: JSONSchema7 } = {
  [ExprVal.Any]: { $ref: 'expression.schema.v1.json#/definitions/any' },
  [ExprVal.Boolean]: { $ref: 'expression.schema.v1.json#/definitions/boolean' },
  [ExprVal.Number]: { $ref: 'expression.schema.v1.json#/definitions/number' },
  [ExprVal.String]: { $ref: 'expression.schema.v1.json#/definitions/string' },
  [ExprVal.Date]: { $ref: 'expression.schema.v1.json#/definitions/string' },
};

type TypeMap<Val extends ExprVal> = Val extends ExprVal.Boolean
  ? boolean
  : Val extends ExprVal.Number
    ? number
    : Val extends ExprVal.String
      ? string
      : never;

/**
 * Generates a type that can be either a pure boolean, number, or string, or an expression that evaluates to
 * one of those types. Be sure you implement support for evaluating the expression as well, because adding
 * this type will not automatically add support for evaluating the expression as well.
 */
export class GenerateExpressionOr<Val extends ExprVal> extends DescribableCodeGenerator<TypeMap<Val>> {
  constructor(public readonly valueType: Val) {
    super();
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    CodeGeneratorContext.curFile().addImport('ExprVal', 'src/features/expressions/types');
    CodeGeneratorContext.curFile().addImport('ExprValToActualOrExpr', 'src/features/expressions/types');
    return symbol ? `type ${symbol} = ${toTsMap[this.valueType]};` : toTsMap[this.valueType];
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      ...toSchemaMap[this.valueType],
    };
  }
}
