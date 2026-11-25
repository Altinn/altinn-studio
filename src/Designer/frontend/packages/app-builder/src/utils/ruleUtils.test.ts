import { describe, expect, it } from 'vitest';
import {
  changeOperator,
  createDefaultRule,
  readHiddenProperty,
  readRequiredProperty,
  toHiddenExpression,
  toRequiredExpression,
} from './ruleUtils';
import type { Rule } from './ruleUtils';

const is: Rule = { componentId: 'type', operator: 'is', values: ['early'] };
const isNot: Rule = { componentId: 'type', operator: 'isNot', values: ['early'] };
const oneOf: Rule = { componentId: 'type', operator: 'oneOf', values: ['early', 'late'] };

describe('toHiddenExpression', () => {
  it('hides the component when the value is something else', () => {
    expect(toHiddenExpression(is)).toEqual(['notEquals', ['component', 'type'], 'early']);
    expect(toHiddenExpression(isNot)).toEqual(['equals', ['component', 'type'], 'early']);
  });

  it('hides the component when the value is none of the values', () => {
    expect(toHiddenExpression(oneOf)).toEqual([
      'not',
      ['or', ['equals', ['component', 'type'], 'early'], ['equals', ['component', 'type'], 'late']],
    ]);
  });
});

describe('toRequiredExpression', () => {
  it('requires the field when the value matches', () => {
    expect(toRequiredExpression(is)).toEqual(['equals', ['component', 'type'], 'early']);
  });
});

describe('reading rules back', () => {
  it.each([is, isNot, oneOf])('reads the hidden expression it wrote for %o', (rule) => {
    expect(readHiddenProperty(toHiddenExpression(rule))).toEqual({ kind: 'rule', rule });
  });

  it.each([is, isNot, oneOf])('reads the required expression it wrote for %o', (rule) => {
    expect(readRequiredProperty(toRequiredExpression(rule))).toEqual({ kind: 'rule', rule });
  });

  it('reads static values', () => {
    expect(readHiddenProperty(undefined)).toEqual({ kind: 'always' });
    expect(readHiddenProperty(true)).toEqual({ kind: 'never' });
    expect(readRequiredProperty(true)).toEqual({ kind: 'always' });
    expect(readRequiredProperty(false)).toEqual({ kind: 'never' });
  });

  it('leaves an expression it cannot show as a rule alone', () => {
    const expression = [
      'and',
      ['equals', ['component', 'a'], 'x'],
      ['equals', ['component', 'b'], 'y'],
    ];
    expect(readHiddenProperty(expression)).toEqual({ kind: 'advanced' });
    expect(readRequiredProperty(['equals', ['dataModel', 'a'], 'x'])).toEqual({ kind: 'advanced' });
  });
});

describe('changeOperator', () => {
  it('keeps one value when the operator takes one', () => {
    expect(changeOperator(oneOf, 'is').values).toEqual(['early']);
    expect(changeOperator(is, 'oneOf').values).toEqual(['early']);
  });
});

describe('createDefaultRule', () => {
  it('starts from the first field with options and its first value', () => {
    const fields = [
      { componentId: 'name', values: [] },
      { componentId: 'type', values: ['early', 'late'] },
    ];
    expect(createDefaultRule(fields)).toEqual(is);
  });

  it('returns undefined when there is no field to check', () => {
    expect(createDefaultRule([])).toBeUndefined();
  });
});
