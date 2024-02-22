import type { SimplifiedExpression } from '../types/SimplifiedExpression';
import type {
  GenericRelationFunc,
  NumberRelationFunc,
  DataLookupFunc,
  KeyLookupFunc,
  LogicalTupleFunc,
} from '../types/Expression';
import { simpleToComplexExpression } from './simpleToComplexExpression';
import type { SimpleSubExpressionValue } from '../types/SimpleSubExpressionValue';
import { LogicalTupleOperator } from '../enums/LogicalTupleOperator';
import { NumberRelationOperator } from '../enums/NumberRelationOperator';
import { DataLookupFuncName } from '../enums/DataLookupFuncName';
import { GeneralRelationOperator } from '../enums/GeneralRelationOperator';
import { KeyLookupFuncName } from '../enums/KeyLookupFuncName';
import { InstanceContext } from '../enums/InstanceContext';
import { SimpleSubExpressionValueType } from '../enums/SimpleSubExpressionValueType';

describe('simpleToComplexExpression', () => {
  it.each([true, false])('Returns the expression when the expression is %s', (value) => {
    const result = simpleToComplexExpression(value);
    expect(result).toBe(value);
  });

  it('Converts an empty expression to null', () => {
    const emptyExpression: SimplifiedExpression = {
      logicalOperator: LogicalTupleOperator.And,
      subExpressions: [],
    };
    const result = simpleToComplexExpression(emptyExpression);
    expect(result).toBeNull();
  });

  it.each(Object.values(NumberRelationOperator))(
    'Converts a single %s subexpression',
    (relationalOperator) => {
      const singleExpression: SimplifiedExpression = {
        logicalOperator: LogicalTupleOperator.And,
        subExpressions: [
          {
            relationalOperator,
            firstOperand: { type: SimpleSubExpressionValueType.Component, id: 'test' },
            secondOperand: { type: SimpleSubExpressionValueType.Number, value: 1 },
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
        subExpressions: [
          {
            relationalOperator,
            firstOperand: {
              type: SimpleSubExpressionValueType.Datamodel,
              path: '#/properties/test',
            },
            secondOperand: { type: SimpleSubExpressionValueType.String, value: 'Lorem ipsum' },
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
    subExpressionValue: SimpleSubExpressionValue;
    expectedResult: DataLookupFunc | KeyLookupFunc | string | number | boolean | null;
  };
  const testExpressionValues: {
    [T in SimpleSubExpressionValue['type']]: SimpleExpressionTestData;
  } = {
    component: {
      subExpressionValue: { type: SimpleSubExpressionValueType.Component, id: 'test' },
      expectedResult: [DataLookupFuncName.Component, 'test'],
    },
    datamodel: {
      subExpressionValue: {
        type: SimpleSubExpressionValueType.Datamodel,
        path: '#/properties/test',
      },
      expectedResult: [DataLookupFuncName.DataModel, '#/properties/test'],
    },
    instanceContext: {
      subExpressionValue: {
        type: SimpleSubExpressionValueType.InstanceContext,
        key: InstanceContext.InstanceId,
      },
      expectedResult: [KeyLookupFuncName.InstanceContext, InstanceContext.InstanceId],
    },
    string: {
      subExpressionValue: { type: SimpleSubExpressionValueType.String, value: 'Lorem ipsum' },
      expectedResult: 'Lorem ipsum',
    },
    number: {
      subExpressionValue: { type: SimpleSubExpressionValueType.Number, value: 1 },
      expectedResult: 1,
    },
    boolean: {
      subExpressionValue: { type: SimpleSubExpressionValueType.Boolean, value: true },
      expectedResult: true,
    },
    null: {
      subExpressionValue: { type: SimpleSubExpressionValueType.Null },
      expectedResult: null,
    },
  };

  it.each(Object.keys(testExpressionValues))('Converts a single %s value', (type) => {
    const relationalOperator = GeneralRelationOperator.Equals;
    const { subExpressionValue, expectedResult } = testExpressionValues[type];
    const singleExpression: SimplifiedExpression = {
      logicalOperator: LogicalTupleOperator.And,
      subExpressions: [
        {
          relationalOperator,
          firstOperand: subExpressionValue,
          secondOperand: { type: SimpleSubExpressionValueType.Boolean, value: false },
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
        subExpressions: [
          {
            relationalOperator: GeneralRelationOperator.Equals,
            firstOperand: { type: SimpleSubExpressionValueType.Boolean, value: true },
            secondOperand: { type: SimpleSubExpressionValueType.Component, id: 'test' },
          },
          {
            relationalOperator: GeneralRelationOperator.NotEquals,
            firstOperand: {
              type: SimpleSubExpressionValueType.Datamodel,
              path: '#/properties/test',
            },
            secondOperand: { type: SimpleSubExpressionValueType.String, value: 'Lorem ipsum' },
          },
          {
            relationalOperator: NumberRelationOperator.GreaterThan,
            firstOperand: { type: SimpleSubExpressionValueType.Number, value: 4 },
            secondOperand: { type: SimpleSubExpressionValueType.Component, id: 'test2' },
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
