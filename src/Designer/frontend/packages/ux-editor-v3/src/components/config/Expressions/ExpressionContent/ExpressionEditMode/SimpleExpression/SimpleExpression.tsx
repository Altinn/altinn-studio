import { Fragment } from 'react';
import type { Expression, SubExpression } from '../../../../../../types/Expressions';
import { Operator } from '../../../../../../types/Expressions';
import { SubExpressionContent } from './SubExpressionContent';
import { useText } from '../../../../../../hooks';
import { StudioToggleGroup } from '@studio/components';

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
          <Fragment key={index}>
            <SubExpressionContent
              subExpression={subExp}
              onUpdateSubExpression={(subExpression: SubExpression) =>
                onUpdateSubExpression(index, subExpression)
              }
              onRemoveSubExpression={() => onRemoveSubExpression(subExp)}
            />
            {index !== expression.subExpressions.length - 1 && (
              <StudioToggleGroup
                onChange={(value) => onUpdateExpressionOperator(value as Operator)}
                value={expression.operator || Operator.And}
              >
                <StudioToggleGroup.Item value={Operator.And}>
                  {t('right_menu.expressions_operator_and')}
                </StudioToggleGroup.Item>
                <StudioToggleGroup.Item value={Operator.Or}>
                  {t('right_menu.expressions_operator_or')}
                </StudioToggleGroup.Item>
              </StudioToggleGroup>
            )}
          </Fragment>
        );
      })}
    </>
  );
};
