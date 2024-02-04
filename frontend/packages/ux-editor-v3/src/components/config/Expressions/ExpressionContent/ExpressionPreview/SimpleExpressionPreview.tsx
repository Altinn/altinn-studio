import React from 'react';
import type { Expression, SubExpression } from '../../../../../types/Expressions';
import {
  DataSource,
  expressionDataSourceTexts,
  expressionFunctionTexts,
  Operator,
} from '../../../../../types/Expressions';
import { ArrowRightIcon } from '@navikt/aksel-icons';
import { useText } from '../../../../../hooks';
import { stringifyValueForDisplay } from '../../../../../utils/expressionsUtils';

export type SimpleExpressionPreviewProps = {
  expression: Expression;
};

export const SimpleExpressionPreview = ({ expression }: SimpleExpressionPreviewProps) => {
  const t = useText();
  return (
    <>
      {expression.subExpressions.map((subExp: SubExpression, index: number) => (
        <div key={index}>
          <p>
            <ArrowRightIcon fontSize='1.5rem' />
            {expressionDataSourceTexts(t)[subExp.dataSource ?? DataSource.Null]}
            <span>{stringifyValueForDisplay(t, subExp.value)}</span>
          </p>
          <strong>{expressionFunctionTexts(t)[subExp.function]}</strong>
          <p>
            <ArrowRightIcon fontSize='1.5rem' />
            {expressionDataSourceTexts(t)[subExp.comparableDataSource ?? DataSource.Null]}
            <span>{stringifyValueForDisplay(t, subExp.comparableValue)}</span>
          </p>
          {index !== expression.subExpressions.length - 1 && (
            <strong>
              {expression.operator === Operator.And
                ? t('right_menu.expressions_operator_and')
                : t('right_menu.expressions_operator_or')}
            </strong>
          )}
        </div>
      ))}
    </>
  );
};
