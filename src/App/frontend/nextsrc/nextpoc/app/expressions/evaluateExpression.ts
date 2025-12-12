/**
 * evaluateExpression.ts
 * A simple evaluator for the array-based expression format in Altinn.
 */
import dot from 'dot-object';
import type { DataObject, ResolvedCompExternal } from 'nextsrc/nextpoc/stores/layoutStore';

export function evaluateExpression(
  expr: any,
  formData: DataObject,
  componentMap?: Record<string, ResolvedCompExternal>,
  parentBinding?: string,
  itemIndex?: number,
): any {
  // If not an array, treat as literal and return directly
  if (!Array.isArray(expr)) {
    return expr;
  }

  //debugger;

  const [operator, ...params] = expr;

  // Helper to evaluate sub-expressions
  const evalParam = (param: any) => evaluateExpression(param, formData, componentMap, parentBinding, itemIndex);

  // Convert a param to number if possible
  const toNumber = (value: any): number => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    throw new Error(`Cannot convert value to number: ${value}`);
  };

  switch (operator) {
    case 'dataModel': {
      // Usage: ["dataModel", "someField"]
      // debugger;
      const fieldName = params[0];
      if (!formData) {
        throw new Error('cannot use dataModel expression without data');
      }

      return dot.pick(fieldName, formData); //formData[fieldName];
    }

    case 'component': {
      const componentId = params[0];
      if (!componentMap) {
        throw new Error('No componentMap provided to evaluate "component"');
      }
      const comp = componentMap[componentId];
      if (!comp) {
        throw new Error(`Component with ID '${componentId}' not found in componentMap`);
      }

      // @ts-ignore
      const binding = comp.dataModelBindings?.simpleBinding;
      if (!binding) {
        throw new Error(`Component '${componentId}' has no simpleBinding`);
      }

      if (!parentBinding) {
        return dot.pick(binding, formData);
      }

      const fieldSplitted = binding.split('.');
      if (fieldSplitted.length === 0) {
        throw new Error('field not found');
      }

      const field = fieldSplitted[fieldSplitted.length - 1];

      const retValue = dot.pick(`${parentBinding}[${itemIndex}].${field}`, formData);

      return retValue;
    }

    case 'equals': {
      // Usage: ["equals", left, right]
      const left = evalParam(params[0]);
      const right = evalParam(params[1]);
      return left === right;
    }

    case 'notEquals': {
      const left = evalParam(params[0]);
      const right = evalParam(params[1]);
      return left !== right;
    }

    case 'not': {
      const value = evalParam(params[0]);
      return !value;
    }

    case 'and': {
      return params.every((p) => Boolean(evalParam(p)));
    }

    case 'or': {
      return params.some((p) => Boolean(evalParam(p)));
    }

    case 'if': {
      const [conditionExpr, thenExpr, elseExpr] = params;
      return evalParam(conditionExpr) ? evalParam(thenExpr) : evalParam(elseExpr);
    }

    case 'lessThan': {
      const left = toNumber(evalParam(params[0]));
      const right = toNumber(evalParam(params[1]));
      return left < right;
    }

    case 'greaterThan': {
      const left = toNumber(evalParam(params[0]));
      const right = toNumber(evalParam(params[1]));
      return left > right;
    }

    case 'add': {
      return params.reduce((acc, p) => acc + toNumber(evalParam(p)), 0);
    }

    case 'subtract': {
      const left = toNumber(evalParam(params[0]));
      const right = toNumber(evalParam(params[1]));
      return left - right;
    }

    case 'multiply': {
      const left = toNumber(evalParam(params[0]));
      const right = toNumber(evalParam(params[1]));
      return left * right;
    }

    case 'divide': {
      const left = toNumber(evalParam(params[0]));
      const right = toNumber(evalParam(params[1]));
      return left / right;
    }

    case 'concat': {
      const values = params.map(evalParam);
      return values.join('');
    }

    case 'lowerCase': {
      const value = evalParam(params[0]);
      return String(value).toLowerCase();
    }

    case 'upperCase': {
      const value = evalParam(params[0]);
      return String(value).toUpperCase();
    }

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
