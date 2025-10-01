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
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
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

  it.each(Object.values(GeneralRelationOperator))(
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
    'component lookup': [DataLookupFuncName.Component, 'test'],
    'data model lookup': [DataLookupFuncName.DataModel, 'test'],
    'instance context lookup': [KeyLookupFuncName.InstanceContext, InstanceContext.AppId],
    'gateway action lookup': [KeyLookupFuncName.GatewayAction],
    string: 'test',
    number: 1,
    boolean: true,
    null: null,
  };

  it.each(Object.keys(expressionValueTestData))(
    'Returns true when the expression is a simple relation function with a %s value',
    (key) => {
      const value = expressionValueTestData[key];
      const expression: GenericRelationFunc = [GeneralRelationOperator.Equals, value, true];
      expect(isExpressionSimple(expression)).toBe(true);
    },
  );

  it.each(Object.values(LogicalTupleOperator))(
    'Returns true when the expression is an "%s" operation of relational functions',
    (operator) => {
      const expression: LogicalTupleFunc = [
        operator,
        [GeneralRelationOperator.Equals, [DataLookupFuncName.DataModel, 'test'], 'value'],
        [GeneralRelationOperator.NotEquals, [DataLookupFuncName.DataModel, 'test'], 'value'],
      ];
      expect(isExpressionSimple(expression)).toBe(true);
    },
  );

  it('Returns false when the expression is a string', () => {
    expect(isExpressionSimple('test')).toBe(false);
  });

  it('should return false if the expression is gateway action function', () => {
    expect(isExpressionSimple([KeyLookupFuncName.GatewayAction])).toBe(false);
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
      GeneralRelationOperator.Equals,
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
        [GeneralRelationOperator.Equals, [DataLookupFuncName.DataModel, 'test'], 'value'],
        [GeneralRelationOperator.NotEquals, [DataLookupFuncName.DataModel, 'test'], 'value2'],
      ],
      [GeneralRelationOperator.Equals, [DataLookupFuncName.Component, 'test'], 'value'],
    ];
    expect(isExpressionSimple(expression)).toBe(false);
  });

  it('Returns false when the expression is a logical tuple with a lookup value with several levels', () => {
    const expression: LogicalTupleFunc = [
      LogicalTupleOperator.And,
      [
        GeneralRelationOperator.Equals,
        [DataLookupFuncName.DataModel, [KeyLookupFuncName.InstanceContext, InstanceContext.AppId]],
        'value',
      ],
      [GeneralRelationOperator.Equals, [DataLookupFuncName.Component, 'test'], 'value'],
    ];

    expect(isExpressionSimple(expression)).toBe(false);
  });
});
