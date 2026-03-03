export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ExpressionValidationRule {
  message: unknown;
  condition: unknown;
  severity: ValidationSeverity;
  showImmediately: boolean;
}

interface ExpressionValidationRefResolved {
  message: unknown;
  condition: unknown;
  severity?: ValidationSeverity;
  showImmediately?: boolean;
}

type ExpressionValidationRefUnresolved =
  | ExpressionValidationRefResolved
  | (Partial<ExpressionValidationRefResolved> & { ref: string });

export interface ExpressionValidationConfig {
  validations: Record<string, (ExpressionValidationRefUnresolved | string)[]>;
  definitions?: Record<string, ExpressionValidationRefUnresolved>;
}

export type ResolvedExpressionValidations = Record<string, ExpressionValidationRule[]>;

export function resolveExpressionValidationConfig(
  config: ExpressionValidationConfig,
): ResolvedExpressionValidations {
  const resolvedDefinitions: Record<string, ExpressionValidationRefResolved> = {};

  for (const [name, definition] of Object.entries(config.definitions ?? {})) {
    const resolved = resolveDefinition(definition, resolvedDefinitions);
    if (resolved) {
      resolvedDefinitions[name] = resolved;
    }
  }

  const result: ResolvedExpressionValidations = {};

  for (const [field, definitions] of Object.entries(config.validations ?? {})) {
    const rules: ExpressionValidationRule[] = [];
    for (const definition of definitions) {
      const resolved = resolveValidation(definition, resolvedDefinitions);
      if (resolved) {
        rules.push(resolved);
      }
    }
    if (rules.length > 0) {
      result[field] = rules;
    }
  }

  return result;
}

function resolveDefinition(
  definition: ExpressionValidationRefUnresolved,
  resolved: Record<string, ExpressionValidationRefResolved>,
): ExpressionValidationRefResolved | null {
  let result = definition;

  if ('ref' in definition && definition.ref) {
    const reference = resolved[definition.ref];
    if (!reference) {
      console.warn(`Expression validation: ref "${definition.ref}" not found`);
      return null;
    }
    const { ref: _, ...rest } = definition;
    result = { ...reference, ...rest };
  }

  if (result.message === undefined || result.condition === undefined) {
    return null;
  }

  return result as ExpressionValidationRefResolved;
}

function resolveValidation(
  definition: ExpressionValidationRefUnresolved | string,
  resolvedDefinitions: Record<string, ExpressionValidationRefResolved>,
): ExpressionValidationRule | null {
  let resolved: ExpressionValidationRefResolved;

  if (typeof definition === 'string') {
    const reference = resolvedDefinitions[definition];
    if (!reference) {
      console.warn(`Expression validation: ref "${definition}" not found`);
      return null;
    }
    resolved = reference;
  } else if ('ref' in definition && definition.ref) {
    const reference = resolvedDefinitions[definition.ref];
    if (!reference) {
      console.warn(`Expression validation: ref "${definition.ref}" not found`);
      return null;
    }
    const { ref: _, ...rest } = definition;
    resolved = { ...reference, ...rest };
  } else {
    resolved = definition as ExpressionValidationRefResolved;
  }

  if (resolved.message === undefined || resolved.condition === undefined) {
    return null;
  }

  return {
    message: resolved.message,
    condition: resolved.condition,
    severity: resolved.severity ?? 'error',
    showImmediately: resolved.showImmediately ?? false,
  };
}
