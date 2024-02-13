import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import { DEFAULT_LOGICAL_OPERATOR } from '../config';
import { complexToSimpleExpression } from './complexToSimpleExpression';
import type {
  Expression,
  GenericRelationFunc,
  LogicalTupleFunc,
  NumberRelationFunc,
} from '../types/Expression';
import type { ValueInComplexFormat } from '../types/ValueInComplexFormat';
import type { SimpleSubExpressionValue } from '../types/SimpleSubExpressionValue';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { GenericRelationOperator } from '../enums/GenericRelationOperator';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { InstanceContext } from '../enums/InstanceContext';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { SimpleSubExpressionValueType } from '../enums/SimpleSubExpressionValueType';

describe('complexToSimpleExpression', () => {
  it.each([true, false])('Returns true when the expression is %s', (value) => {
    expect(complexToSimpleExpression(value)).toBe(value);
  });

  it('Returns an empty expression when the expression is null', () => {
    const expectedResult: SimplifiedExpression = {
      logicalOperator: DEFAULT_LOGICAL_OPERATOR,
      subExpressions: [],
    };
    const result = complexToSimpleExpression(null);
    expect(result).toEqual(expectedResult);
  });

  it.each(Object.values(NumberRelationOperator))('Converts a %s function', (operator) => {
    const expression: NumberRelationFunc = [operator, [DataLookupFuncName.DataModel, 'test'], 1];
    const expectedResult: SimplifiedExpression = {
      logicalOperator: DEFAULT_LOGICAL_OPERATOR,
      subExpressions: [
        {
          relationalOperator: operator,
          firstOperand: { type: SimpleSubExpressionValueType.Datamodel, path: 'test' },
          secondOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
        },
      ],
    };
    expect(complexToSimpleExpression(expression)).toEqual(expectedResult);
  });

  it.each(Object.values(GenericRelationOperator))('Converts a %s function', (operator) => {
    const expression: GenericRelationFunc = [operator, 1, [DataLookupFuncName.DataModel, 'test']];
    const expectedResult: SimplifiedExpression = {
      logicalOperator: DEFAULT_LOGICAL_OPERATOR,
      subExpressions: [
        {
          relationalOperator: operator,
          firstOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
          secondOperand: { type: SimpleSubExpressionValueType.Datamodel, path: 'test' },
        },
      ],
    };
    expect(complexToSimpleExpression(expression)).toEqual(expectedResult);
  });

  type ValueTestDataItem = {
    input: ValueInComplexFormat;
    expectedOutput: SimpleSubExpressionValue;
  };
  const expressionValueTestData: Record<string, ValueTestDataItem> = {
    'component loookup': {
      input: [DataLookupFuncName.Component, 'someid'],
      expectedOutput: { type: SimpleSubExpressionValueType.Component, id: 'someid' },
    },
    'datamodel lookup': {
      input: [DataLookupFuncName.DataModel, '#/test'],
      expectedOutput: { type: SimpleSubExpressionValueType.Datamodel, path: '#/test' },
    },
    'instance context lookup': {
      input: [KeyLookupFuncName.InstanceContext, InstanceContext.InstanceId],
      expectedOutput: {
        type: SimpleSubExpressionValueType.InstanceContext,
        key: InstanceContext.InstanceId,
      },
    },
    string: {
      input: 'test',
      expectedOutput: { type: SimpleSubExpressionValueType.String, value: 'test' },
    },
    number: {
      input: 1,
      expectedOutput: { type: SimpleSubExpressionValueType.Number, value: 1 },
    },
    boolean: {
      input: true,
      expectedOutput: { type: SimpleSubExpressionValueType.Boolean, value: true },
    },
    null: {
      input: null,
      expectedOutput: { type: SimpleSubExpressionValueType.Null },
    },
  };

  it.each(Object.keys(expressionValueTestData))(
    'Converts a simple relation function with a %s value',
    (key) => {
      const { input, expectedOutput } = expressionValueTestData[key];
      const expression: GenericRelationFunc = [GenericRelationOperator.Equals, input, 1];
      const expectedResult: SimplifiedExpression = {
        logicalOperator: DEFAULT_LOGICAL_OPERATOR,
        subExpressions: [
          {
            relationalOperator: GenericRelationOperator.Equals,
            firstOperand: expectedOutput,
            secondOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
          },
        ],
      };
      expect(complexToSimpleExpression(expression)).toEqual(expectedResult);
    },
  );

  it.each(Object.values(LogicalTupleOperator))(
    'Converts an "%s" operation of relational functions',
    (operator) => {
      const expression: LogicalTupleFunc = [
        operator,
        [GenericRelationOperator.Equals, [DataLookupFuncName.DataModel, '#/test'], true],
        [
          GenericRelationOperator.NotEquals,
          'test',
          [KeyLookupFuncName.InstanceContext, InstanceContext.InstanceOwnerPartyId],
        ],
      ];
      const expectedResult: SimplifiedExpression = {
        logicalOperator: operator,
        subExpressions: [
          {
            relationalOperator: GenericRelationOperator.Equals,
            firstOperand: { type: SimpleSubExpressionValueType.Datamodel, path: '#/test' },
            secondOperand: { type: SimpleSubExpressionValueType.Boolean, value: true },
          },
          {
            relationalOperator: GenericRelationOperator.NotEquals,
            firstOperand: { type: SimpleSubExpressionValueType.String, value: 'test' },
            secondOperand: {
              type: SimpleSubExpressionValueType.InstanceContext,
              key: InstanceContext.InstanceOwnerPartyId,
            },
          },
        ],
      };
      const result = complexToSimpleExpression(expression);
      expect(result).toEqual(expectedResult);
    },
  );

  it('Throws an error if the expression does not satisfy the conditions for a simple expression', () => {
    const unConvertableExpression: Expression = ['startsWith', 'test', 'test'];
    expect(() => complexToSimpleExpression(unConvertableExpression)).toThrowError(
      'Expression is not simple.',
    );
  });
});
