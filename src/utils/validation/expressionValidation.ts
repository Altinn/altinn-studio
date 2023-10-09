import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { asExpression } from 'src/features/expressions/validation';
import { getBaseDataModelBindings } from 'src/utils/databindings';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { ExprConfig } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  IExpressionValidation,
  IExpressionValidationConfig,
  IExpressionValidationRefResolved,
  IExpressionValidationRefUnresolved,
  IExpressionValidations,
  IValidationContext,
  IValidationObject,
} from 'src/utils/validation/types';

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
      severity: 'errors',
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
      severity: 'errors',
      ...resolvedDefinition,
    } as IExpressionValidation;
  }

  expressionValidation.condition = asExpression(
    expressionValidation.condition,
    EXPR_CONFIG,
    `Custom validation:\nValidation for ${field} has an invalid condition.`,
  );

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
  { customValidation, langTools }: IValidationContext,
  overrideFormData?: IFormData,
): IValidationObject[] {
  const resolvedDataModelBindings = node.item.dataModelBindings;
  const baseDataModelBindings = getBaseDataModelBindings(resolvedDataModelBindings);

  if (!customValidation || !resolvedDataModelBindings || !baseDataModelBindings) {
    return [];
  }

  const dataSources = node.getDataSources();
  const newDataSources = {
    ...dataSources,
    formData: {
      ...dataSources.formData,
      ...overrideFormData,
    },
  };
  const validationObjects: IValidationObject[] = [];

  for (const [bindingKey, field] of Object.entries(baseDataModelBindings)) {
    const validationDefs = customValidation[field];
    if (!validationDefs) {
      continue;
    }
    for (const validationDef of validationDefs) {
      const resolvedField = resolvedDataModelBindings[bindingKey];
      const isInvalid = evalExpr(validationDef.condition, node, newDataSources, {
        config: EXPR_CONFIG,
        positionalArguments: [resolvedField],
      });
      if (isInvalid) {
        const message = langTools.langAsString(validationDef.message);
        validationObjects.push(buildValidationObject(node, validationDef.severity, message, bindingKey));
      }
    }
  }
  return validationObjects;
}
