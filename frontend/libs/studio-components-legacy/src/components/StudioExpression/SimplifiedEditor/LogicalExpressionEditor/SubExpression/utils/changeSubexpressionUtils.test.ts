import {
  changeFirstOperand,
  changeRelationalOperator,
  changeSecondOperand,
} from './changeSubexpressionUtils';
import type { SimpleSubexpression } from '../../../../types/SimpleSubexpression';
import { SimpleSubexpressionValueType } from '../../../../enums/SimpleSubexpressionValueType';
import { GeneralRelationOperator } from '../../../../enums/GeneralRelationOperator';
import type { SimpleSubexpressionValue } from '../../../../types/SimpleSubexpressionValue';

describe('changeSubexpressionUtils', () => {
  const createTestExpression = (): SimpleSubexpression => ({
    relationalOperator: GeneralRelationOperator.Equals,
    firstOperand: {
      type: SimpleSubexpressionValueType.String,
      value: 'test',
    },
    secondOperand: {
      type: SimpleSubexpressionValueType.String,
      value: 'test',
    },
  });

  describe('changeRelationalOperator', () => {
    it('Changes the relational operator of a SimpleSubexpression object', () => {
      const expression = createTestExpression();
      const newOperator = GeneralRelationOperator.NotEquals;
      const newExpression = changeRelationalOperator(expression, newOperator);
      expect(newExpression).toEqual({ ...expression, relationalOperator: newOperator });
    });

    it('Does not change the original object', () => {
      const expression = createTestExpression();
      changeRelationalOperator(createTestExpression(), GeneralRelationOperator.NotEquals);
      expect(expression).toEqual(createTestExpression());
    });
  });

  describe('Operand change', () => {
    type TestCase = {
      changeOperandFunction: typeof changeFirstOperand;
      key: keyof SimpleSubexpression;
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

      it('Changes the correct operand of a SimpleSubexpression object', () => {
        const expression = createTestExpression();
        const newOperand: SimpleSubexpressionValue = {
          type: SimpleSubexpressionValueType.Number,
          value: 5,
        };
        const newExpression = changeOperandFunction(expression, newOperand);
        expect(newExpression).toEqual({ ...expression, [key]: newOperand });
      });

      it('Does not change the original object', () => {
        const expression = createTestExpression();
        changeOperandFunction(createTestExpression(), {
          type: SimpleSubexpressionValueType.Number,
          value: 5,
        });
        expect(expression).toEqual(createTestExpression());
      });
    });
  });
});
