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
import type { SimpleSubexpressionValue } from '../types/SimpleSubexpressionValue';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { InstanceContext } from '../enums/InstanceContext';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { SimpleSubexpressionValueType } from '../enums/SimpleSubexpressionValueType';
import { PredefinedGatewayAction } from '../enums/PredefinedGatewayAction';

describe('complexToSimpleExpression', () => {
  it.each([true, false])('Returns true when the expression is %s', (value) => {
    expect(complexToSimpleExpression(value)).toBe(value);
  });

  it('Returns an empty expression when the expression is null', () => {
    const expectedResult: SimplifiedExpression = {
      logicalOperator: DEFAULT_LOGICAL_OPERATOR,
      subexpressions: [],
    };
    const result = complexToSimpleExpression(null);
    expect(result).toEqual(expectedResult);
  });

  it.each(Object.values(NumberRelationOperator))('Converts a %s function', (operator) => {
    const expression: NumberRelationFunc = [operator, [DataLookupFuncName.DataModel, 'test'], 1];
    const expectedResult: SimplifiedExpression = {
      logicalOperator: DEFAULT_LOGICAL_OPERATOR,
      subexpressions: [
        {
          relationalOperator: operator,
          firstOperand: { type: SimpleSubexpressionValueType.DataModel, path: 'test' },
          secondOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
        },
      ],
    };
    expect(complexToSimpleExpression(expression)).toEqual(expectedResult);
  });

  it.each(Object.values(GeneralRelationOperator))('Converts a %s function', (operator) => {
    const expression: GenericRelationFunc = [operator, 1, [DataLookupFuncName.DataModel, 'test']];
    const expectedResult: SimplifiedExpression = {
      logicalOperator: DEFAULT_LOGICAL_OPERATOR,
      subexpressions: [
        {
          relationalOperator: operator,
          firstOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
          secondOperand: { type: SimpleSubexpressionValueType.DataModel, path: 'test' },
        },
      ],
    };
    expect(complexToSimpleExpression(expression)).toEqual(expectedResult);
  });

  type ValueTestDataItem = {
    input: ValueInComplexFormat;
    expectedOutput: SimpleSubexpressionValue;
  };
  const expressionValueTestData: Record<string, ValueTestDataItem> = {
    'component lookup': {
      input: [DataLookupFuncName.Component, 'someid'],
      expectedOutput: { type: SimpleSubexpressionValueType.Component, id: 'someid' },
    },
    'data model lookup': {
      input: [DataLookupFuncName.DataModel, '#/test'],
      expectedOutput: { type: SimpleSubexpressionValueType.DataModel, path: '#/test' },
    },
    'instance context lookup': {
      input: [KeyLookupFuncName.InstanceContext, InstanceContext.InstanceId],
      expectedOutput: {
        type: SimpleSubexpressionValueType.InstanceContext,
        key: InstanceContext.InstanceId,
      },
    },
    'gateway action lookup': {
      input: [KeyLookupFuncName.GatewayAction],
      expectedOutput: { type: SimpleSubexpressionValueType.CurrentGatewayAction },
    },
    'predefined gateway action': {
      input: PredefinedGatewayAction.Confirm,
      expectedOutput: {
        type: SimpleSubexpressionValueType.PredefinedGatewayAction,
        key: PredefinedGatewayAction.Confirm,
      },
    },
    string: {
      input: 'test',
      expectedOutput: { type: SimpleSubexpressionValueType.String, value: 'test' },
    },
    number: {
      input: 1,
      expectedOutput: { type: SimpleSubexpressionValueType.Number, value: 1 },
    },
    boolean: {
      input: true,
      expectedOutput: { type: SimpleSubexpressionValueType.Boolean, value: true },
    },
    null: {
      input: null,
      expectedOutput: { type: SimpleSubexpressionValueType.Null },
    },
  };

  it.each(Object.keys(expressionValueTestData))(
    'Converts a simple relation function with a %s value',
    (key) => {
      const { input, expectedOutput } = expressionValueTestData[key];
      const expression: GenericRelationFunc = [GeneralRelationOperator.Equals, input, 1];
      const expectedResult: SimplifiedExpression = {
        logicalOperator: DEFAULT_LOGICAL_OPERATOR,
        subexpressions: [
          {
            relationalOperator: GeneralRelationOperator.Equals,
            firstOperand: expectedOutput,
            secondOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
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
        [GeneralRelationOperator.Equals, [DataLookupFuncName.DataModel, '#/test'], true],
        [
          GeneralRelationOperator.NotEquals,
          'test',
          [KeyLookupFuncName.InstanceContext, InstanceContext.InstanceOwnerPartyId],
        ],
      ];
      const expectedResult: SimplifiedExpression = {
        logicalOperator: operator,
        subexpressions: [
          {
            relationalOperator: GeneralRelationOperator.Equals,
            firstOperand: { type: SimpleSubexpressionValueType.DataModel, path: '#/test' },
            secondOperand: { type: SimpleSubexpressionValueType.Boolean, value: true },
          },
          {
            relationalOperator: GeneralRelationOperator.NotEquals,
            firstOperand: { type: SimpleSubexpressionValueType.String, value: 'test' },
            secondOperand: {
              type: SimpleSubexpressionValueType.InstanceContext,
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
