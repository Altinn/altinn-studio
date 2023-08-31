import React from 'react';
import {Expression, Operator, SubExpression} from '../../../types/Expressions';
import {SubExpressionContent} from './SubExpressionContent';
import classes from './SimpleExpression.module.css';
import {Button, ToggleButtonGroup} from '@digdir/design-system-react';
import {useText} from '../../../hooks';
import cn from 'classnames';

export type SimpleExpressionProps = {
  allowToSpecifyExpression: boolean;
  expression: Expression;
  onAddSubExpression: (expressionOperator: Operator) => void;
  onUpdateExpressionOperator: (expressionOperator: Operator) => void;
  onUpdateSubExpression: (index: number, subExpression: SubExpression) => void;
  onRemoveSubExpression: (subExpression: SubExpression) => void;
};

export const SimpleExpression = ({
   allowToSpecifyExpression,
   expression,
   onAddSubExpression,
   onUpdateExpressionOperator,
   onUpdateSubExpression,
   onRemoveSubExpression,
 }: SimpleExpressionProps) => {
  const t = useText();
  return (
    <>
      {expression.subExpressions.map((subExp: SubExpression, index: number) => (
        <div key={subExp.id}>
          <SubExpressionContent
            expressionAction={allowToSpecifyExpression}
            subExpression={subExp}
            onUpdateSubExpression={(subExpression: SubExpression) => onUpdateSubExpression(index, subExpression)}
            onRemoveSubExpression={() => onRemoveSubExpression(subExp)}
          />
          <div className={classes.addExpression}>
            {index === expression.subExpressions.length - 1 ? (
              <Button
                variant='quiet'
                size='small'
                onClick={() => onAddSubExpression(expression.operator || Operator.And)}
              >
                <i
                  className={cn('fa', classes.plusIcon, {
                    'fa-circle-plus': index === expression.subExpressions.length - 1,
                    'fa-circle-plus-outline': index !== expression.subExpressions.length - 1,
                  })}
                />
                {t('right_menu.expressions_add_expression')}
              </Button>
            ) : (
              <div className={classes.andOrToggleButtons}>
                <ToggleButtonGroup
                  items={[
                    {label: 'Og', value: Operator.And},
                    {label: 'Eller', value: Operator.Or}
                  ]}
                  onChange={(value) => onUpdateExpressionOperator(value as Operator)}
                  selectedValue={expression.operator || Operator.And}
                />
              </div>
            )}
          </div>
        </div>
        )
      )}
    </>
  );
}
