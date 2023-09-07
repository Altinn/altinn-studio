import React from 'react';
import {
  Expression,
  expressionDataSourceTexts,
  expressionFunctionTexts,
  Operator,
  SubExpression
} from '../../../types/Expressions';
import classes from './SimpleExpressionPreview.module.css';
import { ArrowRightIcon } from '@navikt/aksel-icons';
import { useText } from '../../../hooks';
import { stringifyValueForDisplay } from '../../../utils/expressionsUtils';

export type SimpleExpressionPreviewProps = {
  expression: Expression;
};

export const SimpleExpressionPreview = ({ expression }: SimpleExpressionPreviewProps) => {
  const t = useText();
  return (
    <>
      {expression.subExpressions.map((subExp: SubExpression, index: number) => (
        <div key={subExp.id}>
          <p>
            <ArrowRightIcon fontSize='1.5rem'/>
            {expressionDataSourceTexts(t)[subExp.dataSource]}
            <span>{stringifyValueForDisplay(subExp.value)}</span>
          </p>
          <p className={classes.bold}>{expressionFunctionTexts(t)[subExp.function]}</p>
          <p>
            <ArrowRightIcon fontSize='1.5rem'/>
            {expressionDataSourceTexts(t)[subExp.comparableDataSource]}
            <span>{stringifyValueForDisplay(subExp.comparableValue)}</span>
          </p>
          {index !== expression.subExpressions.length - 1 && (
            <center className={classes.bold}>
              {expression.operator === Operator.And ? t('right_menu.expressions_operator_and') : t('right_menu.expressions_operator_or')}
            </center>
          )}
        </div>
        )
      )}
    </>
  );
}
