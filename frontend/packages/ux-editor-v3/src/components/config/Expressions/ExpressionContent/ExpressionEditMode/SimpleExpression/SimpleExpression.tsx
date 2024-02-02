import React from 'react';
import type { Expression, SubExpression } from '../../../../../../types/Expressions';
import { Operator } from '../../../../../../types/Expressions';
import { SubExpressionContent } from './SubExpressionContent';
import { LegacyToggleButtonGroup } from '@digdir/design-system-react';
import { useText } from '../../../../../../hooks';
import { Divider } from 'app-shared/primitives';

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
      {expression.subExpressions?.map((subExp: SubExpression, index: number) => (
        <React.Fragment key={index}>
          <Divider marginless />
          <SubExpressionContent
            subExpression={subExp}
            onUpdateSubExpression={(subExpression: SubExpression) =>
              onUpdateSubExpression(index, subExpression)
            }
            onRemoveSubExpression={() => onRemoveSubExpression(subExp)}
          />
          {index !== expression.subExpressions.length - 1 && (
            <LegacyToggleButtonGroup
              items={[
                { label: t('right_menu.expressions_operator_and'), value: Operator.And },
                { label: t('right_menu.expressions_operator_or'), value: Operator.Or },
              ]}
              onChange={(value) => onUpdateExpressionOperator(value as Operator)}
              selectedValue={expression.operator || Operator.And}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};
