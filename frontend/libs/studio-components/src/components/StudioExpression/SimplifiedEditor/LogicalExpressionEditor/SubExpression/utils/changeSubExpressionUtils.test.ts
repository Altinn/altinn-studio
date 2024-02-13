import {
  changeFirstOperand,
  changeRelationalOperator,
  changeSecondOperand,
} from './changeSubExpressionUtils';
import type { SimpleSubExpression } from '../../../../types/SimpleSubExpression';
import { SimpleSubExpressionValueType } from '../../../../enums/SimpleSubExpressionValueType';
import { GenericRelationOperator } from '../../../../enums/GenericRelationOperator';
import type { SimpleSubExpressionValue } from '../../../../types/SimpleSubExpressionValue';

describe('changeSubExpressionUtils', () => {
  const createTestExpression = (): SimpleSubExpression => ({
    relationalOperator: GenericRelationOperator.Equals,
    firstOperand: {
      type: SimpleSubExpressionValueType.String,
      value: 'test',
    },
    secondOperand: {
      type: SimpleSubExpressionValueType.String,
      value: 'test',
    },
  });

  describe('changeRelationalOperator', () => {
    it('Changes the relational operator of a SimpleSubExpression object', () => {
      const expression = createTestExpression();
      const newOperator = GenericRelationOperator.NotEquals;
      const newExpression = changeRelationalOperator(expression, newOperator);
      expect(newExpression).toEqual({ ...expression, relationalOperator: newOperator });
    });

    it('Does not change the original object', () => {
      const expression = createTestExpression();
      changeRelationalOperator(createTestExpression(), GenericRelationOperator.NotEquals);
      expect(expression).toEqual(createTestExpression());
    });
  });

  describe('Operand change', () => {
    type TestCase = {
      changeOperandFunction: typeof changeFirstOperand;
      key: keyof SimpleSubExpression;
    };

    const testCases: { [functionName: string]: TestCase } = {
      changeFirstOperand: {
        changeOperandFunction: changeFirstOperand,
        key: 'firstOperand',
      },
      changeSecondOperand: {
        changeOperandFunction: changeSecondOperand,
        key: 'secondOperand',
      },
    };

    describe.each(Object.keys(testCases))('%s', (functionName) => {
      const { changeOperandFunction, key } = testCases[functionName];

      it('Changes the correct operand of a SimpleSubExpression object', () => {
        const expression = createTestExpression();
        const newOperand: SimpleSubExpressionValue = {
          type: SimpleSubExpressionValueType.Number,
          value: 5,
        };
        const newExpression = changeOperandFunction(expression, newOperand);
        expect(newExpression).toEqual({ ...expression, [key]: newOperand });
      });

      it('Does not change the original object', () => {
        const expression = createTestExpression();
        changeOperandFunction(createTestExpression(), {
          type: SimpleSubExpressionValueType.Number,
          value: 5,
        });
        expect(expression).toEqual(createTestExpression());
      });
    });
  });
});
