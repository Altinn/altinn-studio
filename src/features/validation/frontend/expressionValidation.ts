import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { asExpression } from 'src/features/expressions/validation';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { getBaseDataModelBindings } from 'src/utils/databindings';
import type { ExprConfig, Expression } from 'src/features/expressions/types';
import type {
  FieldValidation,
  IExpressionValidation,
  IExpressionValidationConfig,
  IExpressionValidationRefResolved,
  IExpressionValidationRefUnresolved,
  IExpressionValidations,
  ValidationDataSources,
} from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const EXPR_CONFIG: ExprConfig<ExprVal.Boolean> = {
  defaultValue: false,
  returnType: ExprVal.Boolean,
  resolvePerRow: false,
};

/**
 * Resolves a reusable expression validation definition.
 */
function resolveExpressionValidationDefinition(
  name: string,
  definition: IExpressionValidationRefUnresolved,
  config: { [name: string]: IExpressionValidationRefResolved },
): IExpressionValidationRefResolved | null {
  let resolvedDefinition = definition;

  if ('ref' in definition) {
    const reference = config[definition.ref];
    if (!reference) {
      window.logWarn(
        `Custom validation:\nTried to reference ${definition.ref} in ${name} but it does not exist. Make sure it is defined before it is referenced.`,
      );
      return null;
    }

    const { ref: _, ...definitionWithoutRef } = definition;
    resolvedDefinition = { ...reference, ...definitionWithoutRef };
  }

  resolvedDefinition.condition = asExpression(
    resolvedDefinition.condition,
    EXPR_CONFIG,
    `Custom validation:\nDefinition for ${name} has an invalid condition.`,
  );

  if (!('message' in resolvedDefinition)) {
    window.logWarn(`Custom validation:\nDefinition for ${name} is missing a message.`);
    return null;
  }

  if (typeof resolvedDefinition.condition === 'undefined') {
    window.logWarn(`Custom validation:\nDefinition for ${name} is missing a condition.`);
    return null;
  }

  return resolvedDefinition as IExpressionValidationRefResolved;
}

/**
 * Resolves a single expression validation definition.
 */
function resolveExpressionValidation(
  definition: IExpressionValidationRefUnresolved | string,
  field: string,
  resolvedDefinitions: { [name: string]: IExpressionValidationRefResolved },
): IExpressionValidation | null {
  let expressionValidation: IExpressionValidation | null = null;
  if (typeof definition === 'string') {
    const reference = resolvedDefinitions[definition];
    if (!reference) {
      window.logWarn(
        `Custom validation:\nTried to reference ${definition} in validations.${field} but it does not exist.`,
      );
      return null;
    }

    expressionValidation = {
      severity: 'error',
      showImmediately: false,
      ...reference,
    };
  } else {
    let reference: IExpressionValidationRefResolved | undefined = undefined;
    let resolvedDefinition = definition;

    if ('ref' in definition) {
      reference = resolvedDefinitions[definition.ref];
      if (!reference) {
        window.logWarn(
          `Custom validation:\nTried to reference ${definition.ref} in validations.${field} but it does not exist.`,
        );
      }
      const { ref: _, ...definitionWithoutRef } = definition;
      resolvedDefinition = { ...reference, ...definitionWithoutRef };
    }

    expressionValidation = {
      severity: 'error',
      showImmediately: false,
      ...resolvedDefinition,
    } as IExpressionValidation;
  }

  expressionValidation.condition = asExpression(
    expressionValidation.condition,
    EXPR_CONFIG,
    `Custom validation:\nValidation for ${field} has an invalid condition.`,
  ) as typeof expressionValidation.condition;

  if (!('message' in expressionValidation)) {
    window.logWarn(`Custom validation:\nValidation for ${field} is missing a message.`);
    return null;
  }

  if (typeof expressionValidation.condition === 'undefined') {
    window.logWarn(`Custom validation:\nValidation for ${field} is missing a condition.`);
    return null;
  }

  return expressionValidation;
}

/**
 * Takes an expression validation config and returnes an object with the field validation definitions resolved.
 */
export function resolveExpressionValidationConfig(config: IExpressionValidationConfig): IExpressionValidations {
  const resolvedDefinitions: { [name: string]: IExpressionValidationRefResolved } = {};
  for (const [name, definition] of Object.entries(config.definitions ?? {})) {
    const resolvedDefinition = resolveExpressionValidationDefinition(name, definition, resolvedDefinitions);
    if (!resolvedDefinition) {
      continue;
    }
    resolvedDefinitions[name] = resolvedDefinition;
  }
  const resolvedExpressionValidationDefinitions: IExpressionValidations = {};
  for (const [field, definitions] of Object.entries(config.validations ?? {})) {
    for (const definition of definitions) {
      if (!resolvedExpressionValidationDefinitions[field]?.length) {
        resolvedExpressionValidationDefinitions[field] = [];
      }
      const resolvedDefinition = resolveExpressionValidation(definition, field, resolvedDefinitions);
      if (!resolvedDefinition) {
        continue;
      }
      resolvedExpressionValidationDefinitions[field].push(resolvedDefinition);
    }
  }
  return resolvedExpressionValidationDefinitions;
}

export function runExpressionValidationsOnNode(
  node: LayoutNode,
  { customValidation }: ValidationDataSources,
): FieldValidation[] {
  const resolvedDataModelBindings = node.item.dataModelBindings;
  const baseDataModelBindings = getBaseDataModelBindings(resolvedDataModelBindings);

  if (!customValidation || !resolvedDataModelBindings || !baseDataModelBindings) {
    return [];
  }

  const dataSources = node.getDataSources();
  const validations: FieldValidation[] = [];

  for (const [bindingKey, field] of Object.entries(baseDataModelBindings)) {
    const validationDefs = customValidation[field];
    if (!validationDefs) {
      continue;
    }
    for (const validationDef of validationDefs) {
      const resolvedField = resolvedDataModelBindings[bindingKey];

      const isInvalid = evalExpr(validationDef.condition as Expression, node, dataSources, {
        config: EXPR_CONFIG,
        positionalArguments: [resolvedField],
      });
      if (isInvalid) {
        validations.push({
          field: resolvedField,
          source: FrontendValidationSource.Expression,
          message: { key: validationDef.message },
          severity: validationDef.severity,
          category: validationDef.showImmediately ? 0 : ValidationMask.Expression,
        });
      }
    }
  }
  return validations;
}
