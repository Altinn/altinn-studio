import { isExpressionSimple } from './isExpressionSimple';
import type {
  GenericRelationFunc,
  NumberRelationFunc,
  Expression,
  LogicalTupleFunc,
} from '../types/Expression';
import type { ValueInComplexFormat } from '../types/ValueInComplexFormat';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { GenericRelationOperator } from '../enums/GenericRelationOperator';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { InstanceContext } from '../enums/InstanceContext';

describe('isExpressionSimple', () => {
  it.each([true, false, null])('Returns true when the expression is %s', (value) => {
    expect(isExpressionSimple(value)).toBe(true);
  });

  it.each(Object.values(NumberRelationOperator))(
    'Returns true when the expression is a %s function',
    (operator) => {
      const expression: NumberRelationFunc = [operator, [DataLookupFuncName.DataModel, 'test'], 1];
      expect(isExpressionSimple(expression)).toBe(true);
    },
  );

  it.each(Object.values(GenericRelationOperator))(
    'Returns true when the expression is a %s function',
    (operator) => {
      const expression: GenericRelationFunc = [
        operator,
        'value',
        [DataLookupFuncName.DataModel, 'test'],
      ];
      expect(isExpressionSimple(expression)).toBe(true);
    },
  );

  const expressionValueTestData: Record<string, ValueInComplexFormat> = {
    'component loookup': [DataLookupFuncName.Component, 'test'],
    'datamodel lookup': [DataLookupFuncName.DataModel, 'test'],
    'instance context lookup': [KeyLookupFuncName.InstanceContext, InstanceContext.AppId],
    string: 'test',
    number: 1,
    boolean: true,
    null: null,
  };

  it.each(Object.keys(expressionValueTestData))(
    'Returns true when the expression is a simple relation function with a %s value',
    (key) => {
      const value = expressionValueTestData[key];
      const expression: GenericRelationFunc = [GenericRelationOperator.Equals, value, true];
      expect(isExpressionSimple(expression)).toBe(true);
    },
  );

  it.each(Object.values(LogicalTupleOperator))(
    'Returns true when the expression is an "%s" operation of relational functions',
    (operator) => {
      const expression: LogicalTupleFunc = [
        operator,
        [GenericRelationOperator.Equals, [DataLookupFuncName.DataModel, 'test'], 'value'],
        [GenericRelationOperator.NotEquals, [DataLookupFuncName.DataModel, 'test'], 'value'],
      ];
      expect(isExpressionSimple(expression)).toBe(true);
    },
  );

  it('Returns false when the expression is a string', () => {
    expect(isExpressionSimple('test')).toBe(false);
  });

  it('Returns false when the expression is a number', () => {
    expect(isExpressionSimple(1)).toBe(false);
  });

  it('Returns false when the expression is a data lookup function', () => {
    expect(isExpressionSimple([DataLookupFuncName.DataModel, 'test'])).toBe(false);
  });

  it('Returns false when the expression is a key lookup function', () => {
    expect(isExpressionSimple([KeyLookupFuncName.InstanceContext, InstanceContext.AppId])).toBe(
      false,
    );
  });

  it('Returns false when the expression is an unsupported function', () => {
    expect(isExpressionSimple(['startsWith', 'test', 'test'])).toBe(false);
  });

  it('Returns false when the expression is a logical tuple with an unsupported function', () => {
    const supportedFunction: GenericRelationFunc = [
      GenericRelationOperator.Equals,
      [DataLookupFuncName.DataModel, 'test'],
      'value',
    ];
    const unsupportedFunction: Expression = ['startsWith', 'test', 'test'];
    const expression: LogicalTupleFunc<LogicalTupleOperator.And> = [
      LogicalTupleOperator.And,
      supportedFunction,
      unsupportedFunction,
    ];
    expect(isExpressionSimple(expression)).toBe(false);
  });

  it('Returns false when the expression is a logical tuple with several levels', () => {
    const expression: LogicalTupleFunc = [
      LogicalTupleOperator.And,
      [
        LogicalTupleOperator.Or,
        [GenericRelationOperator.Equals, [DataLookupFuncName.DataModel, 'test'], 'value'],
        [GenericRelationOperator.NotEquals, [DataLookupFuncName.DataModel, 'test'], 'value2'],
      ],
      [GenericRelationOperator.Equals, [DataLookupFuncName.Component, 'test'], 'value'],
    ];
    expect(isExpressionSimple(expression)).toBe(false);
  });

  it('Returns false when the expression is a logical tuple with a lookup value with several levels', () => {
    const expression: LogicalTupleFunc = [
      LogicalTupleOperator.And,
      [
        GenericRelationOperator.Equals,
        [DataLookupFuncName.DataModel, [KeyLookupFuncName.InstanceContext, InstanceContext.AppId]],
        'value',
      ],
      [GenericRelationOperator.Equals, [DataLookupFuncName.Component, 'test'], 'value'],
    ];
    expect(isExpressionSimple(expression)).toBe(false);
  });
});
