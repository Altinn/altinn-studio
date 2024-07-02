import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import type {
  GenericRelationFunc,
  NumberRelationFunc,
  DataLookupFunc,
  KeyLookupFunc,
  LogicalTupleFunc,
} from '../types/Expression';
import { simpleToComplexExpression } from './simpleToComplexExpression';
import type { SimpleSubexpressionValue } from '../types/SimpleSubexpressionValue';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { InstanceContext } from '../enums/InstanceContext';
import { SimpleSubexpressionValueType } from '../enums/SimpleSubexpressionValueType';
import { GatewayActionContext } from '../enums/GatewayActionContext';

describe('simpleToComplexExpression', () => {
  it.each([true, false])('Returns the expression when the expression is %s', (value) => {
    const result = simpleToComplexExpression(value);
    expect(result).toBe(value);
  });

  it('Converts an empty expression to null', () => {
    const emptyExpression: SimplifiedExpression = {
      logicalOperator: LogicalTupleOperator.And,
      subexpressions: [],
    };
    const result = simpleToComplexExpression(emptyExpression);
    expect(result).toBeNull();
  });

  it.each(Object.values(NumberRelationOperator))(
    'Converts a single %s subexpression',
    (relationalOperator) => {
      const singleExpression: SimplifiedExpression = {
        logicalOperator: LogicalTupleOperator.And,
        subexpressions: [
          {
            relationalOperator,
            firstOperand: { type: SimpleSubexpressionValueType.Component, id: 'test' },
            secondOperand: { type: SimpleSubexpressionValueType.Number, value: 1 },
          },
        ],
      };
      const result = simpleToComplexExpression(singleExpression);
      const expectedResult: NumberRelationFunc = [
        relationalOperator,
        [DataLookupFuncName.Component, 'test'],
        1,
      ];
      expect(result).toEqual(expectedResult);
    },
  );

  it.each(Object.values(GeneralRelationOperator))(
    'Converts a single %s subexpression',
    (relationalOperator) => {
      const singleExpression: SimplifiedExpression = {
        logicalOperator: LogicalTupleOperator.And,
        subexpressions: [
          {
            relationalOperator,
            firstOperand: {
              type: SimpleSubexpressionValueType.DataModel,
              path: '#/properties/test',
            },
            secondOperand: { type: SimpleSubexpressionValueType.String, value: 'Lorem ipsum' },
          },
        ],
      };
      const result = simpleToComplexExpression(singleExpression);
      const expectedResult: GenericRelationFunc = [
        relationalOperator,
        [DataLookupFuncName.DataModel, '#/properties/test'],
        'Lorem ipsum',
      ];
      expect(result).toEqual(expectedResult);
    },
  );

  type SimpleExpressionTestData = {
    subexpressionValue: SimpleSubexpressionValue;
    expectedResult: DataLookupFunc | KeyLookupFunc | string | number | boolean | null | [string];
  };
  const testExpressionValues: {
    [T in SimpleSubexpressionValue['type']]: SimpleExpressionTestData;
  } = {
    component: {
      subexpressionValue: { type: SimpleSubexpressionValueType.Component, id: 'test' },
      expectedResult: [DataLookupFuncName.Component, 'test'],
    },
    dataModel: {
      subexpressionValue: {
        type: SimpleSubexpressionValueType.DataModel,
        path: '#/properties/test',
      },
      expectedResult: [DataLookupFuncName.DataModel, '#/properties/test'],
    },
    gatewayAction: {
      subexpressionValue: {
        type: SimpleSubexpressionValueType.GatewayAction,
        value: 'GatewayAction',
      },
      expectedResult: [DataLookupFuncName.GatewayAction],
    },
    gatewayActionContext: {
      subexpressionValue: {
        type: SimpleSubexpressionValueType.GatewayActionContext,
        key: GatewayActionContext.Sign,
      },
      expectedResult: 'sign',
    },
    instanceContext: {
      subexpressionValue: {
        type: SimpleSubexpressionValueType.InstanceContext,
        key: InstanceContext.InstanceId,
      },
      expectedResult: [KeyLookupFuncName.InstanceContext, InstanceContext.InstanceId],
    },
    string: {
      subexpressionValue: { type: SimpleSubexpressionValueType.String, value: 'Lorem ipsum' },
      expectedResult: 'Lorem ipsum',
    },
    number: {
      subexpressionValue: { type: SimpleSubexpressionValueType.Number, value: 1 },
      expectedResult: 1,
    },
    boolean: {
      subexpressionValue: { type: SimpleSubexpressionValueType.Boolean, value: true },
      expectedResult: true,
    },
    null: {
      subexpressionValue: { type: SimpleSubexpressionValueType.Null },
      expectedResult: null,
    },
  };

  it.each(Object.keys(testExpressionValues))('Converts a single %s value', (type) => {
    const relationalOperator = GeneralRelationOperator.Equals;
    const { subexpressionValue, expectedResult } = testExpressionValues[type];
    const singleExpression: SimplifiedExpression = {
      logicalOperator: LogicalTupleOperator.And,
      subexpressions: [
        {
          relationalOperator,
          firstOperand: subexpressionValue,
          secondOperand: { type: SimpleSubexpressionValueType.Boolean, value: false },
        },
      ],
    };
    const result = simpleToComplexExpression(singleExpression);
    const expectedFinalResult = [relationalOperator, expectedResult, false];
    expect(result).toEqual(expectedFinalResult);
  });

  it.each(Object.values(LogicalTupleOperator))(
    'Converts a logical tuple expression when the operator is "%s"',
    (logicalOperator) => {
      const logicalTupleExpression: SimplifiedExpression = {
        logicalOperator,
        subexpressions: [
          {
            relationalOperator: GeneralRelationOperator.Equals,
            firstOperand: { type: SimpleSubexpressionValueType.Boolean, value: true },
            secondOperand: { type: SimpleSubexpressionValueType.Component, id: 'test' },
          },
          {
            relationalOperator: GeneralRelationOperator.NotEquals,
            firstOperand: {
              type: SimpleSubexpressionValueType.DataModel,
              path: '#/properties/test',
            },
            secondOperand: { type: SimpleSubexpressionValueType.String, value: 'Lorem ipsum' },
          },
          {
            relationalOperator: NumberRelationOperator.GreaterThan,
            firstOperand: { type: SimpleSubexpressionValueType.Number, value: 4 },
            secondOperand: { type: SimpleSubexpressionValueType.Component, id: 'test2' },
          },
        ],
      };
      const expectedResult: LogicalTupleFunc = [
        logicalOperator,
        [GeneralRelationOperator.Equals, true, [DataLookupFuncName.Component, 'test']],
        [
          GeneralRelationOperator.NotEquals,
          [DataLookupFuncName.DataModel, '#/properties/test'],
          'Lorem ipsum',
        ],
        [NumberRelationOperator.GreaterThan, 4, [DataLookupFuncName.Component, 'test2']],
      ];
      const result = simpleToComplexExpression(logicalTupleExpression);
      expect(result).toEqual(expectedResult);
    },
  );
});
