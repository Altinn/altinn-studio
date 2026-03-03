import type { FormDataPrimitive } from 'nextsrc/core/api-client/data.api';

export interface ExpressionDataSources {
  formDataGetter: (path: string) => FormDataPrimitive;
  instanceDataSources: Record<string, string> | null;
  frontendSettings: Record<string, string | undefined> | null;
  textResourceResolver?: (key: string) => string;
  positionalArguments?: unknown[];
  /** Resolve a component ID to its current form data value (row-aware for repeating groups) */
  componentLookup?: (componentId: string) => FormDataPrimitive | undefined;
}

type Expression = unknown;

export function evaluateExpression(expr: Expression, dataSources: ExpressionDataSources): unknown {
  if (!Array.isArray(expr)) {
    return expr;
  }

  const [func, ...args] = expr;

  switch (func) {
    case 'equals':
      return typeSafeEquals(evaluateExpression(args[0], dataSources), evaluateExpression(args[1], dataSources));

    case 'notEquals':
      return !typeSafeEquals(evaluateExpression(args[0], dataSources), evaluateExpression(args[1], dataSources));

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

    case 'argv': {
      const index = toNumber(args[0]);
      if (index === null || !dataSources.positionalArguments) {
        return null;
      }
      return dataSources.positionalArguments[index] ?? null;
    }

    case 'text': {
      const key = String(evaluateExpression(args[0], dataSources) ?? '');
      return dataSources.textResourceResolver?.(key) ?? key;
    }

    case 'dataModel':
      return dataSources.formDataGetter(String(evaluateExpression(args[0], dataSources) ?? ''));

    case 'instanceContext': {
      const key = String(args[0] ?? '');
      return dataSources.instanceDataSources?.[key] ?? null;
    }

    case 'frontendSettings': {
      const key = String(args[0] ?? '');
      return dataSources.frontendSettings?.[key] ?? null;
    }

    case 'component': {
      const componentId = String(evaluateExpression(args[0], dataSources) ?? '');
      if (dataSources.componentLookup) {
        return dataSources.componentLookup(componentId);
      }
      // Fallback: treat as data model path (won't work for repeating groups)
      return dataSources.formDataGetter(componentId);
    }

    case 'concat': {
      return args.map((a) => String(evaluateExpression(a, dataSources) ?? '')).join('');
    }

    case 'contains': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      const search = String(evaluateExpression(args[1], dataSources) ?? '');
      return str.includes(search);
    }

    case 'notContains': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      const search = String(evaluateExpression(args[1], dataSources) ?? '');
      return !str.includes(search);
    }

    case 'endsWith': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      const suffix = String(evaluateExpression(args[1], dataSources) ?? '');
      return str.endsWith(suffix);
    }

    case 'startsWith': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      const prefix = String(evaluateExpression(args[1], dataSources) ?? '');
      return str.startsWith(prefix);
    }

    case 'stringLength': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      return str.length;
    }

    case 'lowerCase': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      return str.toLowerCase();
    }

    case 'upperCase': {
      const str = String(evaluateExpression(args[0], dataSources) ?? '');
      return str.toUpperCase();
    }

    case 'greaterThan': {
      const a = toNumber(evaluateExpression(args[0], dataSources));
      const b = toNumber(evaluateExpression(args[1], dataSources));
      return a !== null && b !== null && a > b;
    }

    case 'lessThan': {
      const a = toNumber(evaluateExpression(args[0], dataSources));
      const b = toNumber(evaluateExpression(args[1], dataSources));
      return a !== null && b !== null && a < b;
    }

    case 'greaterThanEq': {
      const a = toNumber(evaluateExpression(args[0], dataSources));
      const b = toNumber(evaluateExpression(args[1], dataSources));
      return a !== null && b !== null && a >= b;
    }

    case 'lessThanEq': {
      const a = toNumber(evaluateExpression(args[0], dataSources));
      const b = toNumber(evaluateExpression(args[1], dataSources));
      return a !== null && b !== null && a <= b;
    }

    case 'round': {
      const val = toNumber(evaluateExpression(args[0], dataSources));
      if (val === null) {
        return null;
      }
      const decimals = toNumber(evaluateExpression(args[1], dataSources)) ?? 0;
      const factor = Math.pow(10, decimals);
      return Math.round(val * factor) / factor;
    }

    case 'floor': {
      const val = toNumber(evaluateExpression(args[0], dataSources));
      return val !== null ? Math.floor(val) : null;
    }

    case 'ceil': {
      const val = toNumber(evaluateExpression(args[0], dataSources));
      return val !== null ? Math.ceil(val) : null;
    }

    default:
      return null;
  }
}

export function evaluateBoolean(expr: Expression, dataSources: ExpressionDataSources, defaultValue: boolean): boolean {
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

export function evaluateString(expr: Expression, dataSources: ExpressionDataSources): string {
  if (typeof expr === 'string') {
    return expr;
  }
  if (!Array.isArray(expr)) {
    return String(expr ?? '');
  }
  const result = evaluateExpression(expr, dataSources);
  return String(result ?? '');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return null;
}

/**
 * Type-aware equality for expression comparison. When both operands are the
 * same type, uses strict equality. When types differ (e.g. boolean `false` vs
 * string `"false"`), converts both to strings before comparing. This handles
 * the common case where form data is coerced to a native type (boolean/number)
 * by convertData but the expression literal is still a string.
 */
function typeSafeEquals(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || a === undefined || b === null || b === undefined) {
    return a == b; // null == undefined → true
  }
  if (typeof a === typeof b) {
    return false; // same type, already failed strict equality
  }
  return String(a) === String(b);
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
