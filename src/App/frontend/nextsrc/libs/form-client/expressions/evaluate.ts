import type { FormDataPrimitive } from 'nextsrc/core/apiClient/dataApi';

export interface ExpressionDataSources {
  formDataGetter: (path: string) => FormDataPrimitive;
  instanceDataSources: Record<string, string> | null;
  frontendSettings: Record<string, string | undefined> | null;
}

type Expression = unknown;

export function evaluateExpression(expr: Expression, dataSources: ExpressionDataSources): unknown {
  if (!Array.isArray(expr)) {
    return expr;
  }

  const [func, ...args] = expr;

  switch (func) {
    case 'equals':
      return evaluateExpression(args[0], dataSources) === evaluateExpression(args[1], dataSources);

    case 'notEquals':
      return evaluateExpression(args[0], dataSources) !== evaluateExpression(args[1], dataSources);

    case 'not':
      return !toBoolean(evaluateExpression(args[0], dataSources));

    case 'and': {
      for (const arg of args) {
        if (!toBoolean(evaluateExpression(arg, dataSources))) {
          return false;
        }
      }
      return true;
    }

    case 'or': {
      for (const arg of args) {
        if (toBoolean(evaluateExpression(arg, dataSources))) {
          return true;
        }
      }
      return false;
    }

    case 'if': {
      const condition = toBoolean(evaluateExpression(args[0], dataSources));
      return condition
        ? evaluateExpression(args[1], dataSources)
        : args.length > 2
          ? evaluateExpression(args[2], dataSources)
          : null;
    }

    case 'dataModel':
      return dataSources.formDataGetter(String(args[0] ?? ''));

    case 'instanceContext': {
      const key = String(args[0] ?? '');
      return dataSources.instanceDataSources?.[key] ?? null;
    }

    case 'frontendSettings': {
      const key = String(args[0] ?? '');
      return dataSources.frontendSettings?.[key] ?? null;
    }

    default:
      return null;
  }
}

export function evaluateBoolean(
  expr: Expression,
  dataSources: ExpressionDataSources,
  defaultValue: boolean,
): boolean {
  if (typeof expr === 'boolean') {
    return expr;
  }
  if (!Array.isArray(expr)) {
    return defaultValue;
  }
  const result = evaluateExpression(expr, dataSources);
  if (typeof result === 'boolean') {
    return result;
  }
  return defaultValue;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > 0;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return value !== null && value !== undefined;
}
