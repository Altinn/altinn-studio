import React from 'react';
import classes from './ComplexExpression.module.css';
import { Alert, TextArea } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Expression } from '../../../types/Expressions';
import { stringifyData } from '../../../utils/jsonUtils';

export type ComplexExpressionProps = {
  disabled?: boolean;
  expression: Expression;
  onChange?: (expression: string) => void;
};

export const ComplexExpression = ({ disabled = false, expression, onChange }: ComplexExpressionProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.root}>
      <TextArea
        disabled={disabled}
        onChange={event => onChange?.(event.target.value)}
        value={stringifyData(expression.complexExpression)}
      />
      <Alert>
        {t('right_menu.expressions_complex_expression_message')}
      </Alert>
    </div>
  );
}
