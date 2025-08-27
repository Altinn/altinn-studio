import React from 'react';
import type { Expression, SubExpression } from '../../../../../../types/Expressions';
import { Operator } from '../../../../../../types/Expressions';
import { SubExpressionContent } from './SubExpressionContent';
import { useText } from '../../../../../../hooks';
import { ToggleGroup } from '@digdir/designsystemet-react';

export type SimpleExpressionProps = {
  expression: Expression;
  onUpdateExpressionOperator: (expressionOperator: Operator) => void;
  onUpdateSubExpression: (index: number, subExpression: SubExpression) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
};

export const SimpleExpression = ({
  expression,
  onUpdateExpressionOperator,
  onUpdateSubExpression,
  onRemoveSubExpression,
}: SimpleExpressionProps) => {
  const t = useText();
  return (
    <>
      {expression.subExpressions?.map((subExp: SubExpression, index: number) => {
        return (
          <React.Fragment key={index}>
            <SubExpressionContent
              subExpression={subExp}
              onUpdateSubExpression={(subExpression: SubExpression) =>
                onUpdateSubExpression(index, subExpression)
              }
              onRemoveSubExpression={() => onRemoveSubExpression(subExp)}
            />
            {index !== expression.subExpressions.length - 1 && (
              <ToggleGroup
                onChange={(value) => onUpdateExpressionOperator(value as Operator)}
                value={expression.operator || Operator.And}
              >
                <ToggleGroup.Item value={Operator.And}>
                  {t('right_menu.expressions_operator_and')}
                </ToggleGroup.Item>
                <ToggleGroup.Item value={Operator.Or}>
                  {t('right_menu.expressions_operator_or')}
                </ToggleGroup.Item>
              </ToggleGroup>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
