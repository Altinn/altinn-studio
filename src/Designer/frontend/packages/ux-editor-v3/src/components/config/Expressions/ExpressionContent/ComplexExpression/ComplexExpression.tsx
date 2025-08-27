import React from 'react';
import classes from './ComplexExpression.module.css';
import { Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import type { Expression } from '../../../../../types/Expressions';
import { stringifyData } from '../../../../../utils/jsonUtils';
import { StudioTextarea } from '@studio/components-legacy';

export type ComplexExpressionProps = {
  disabled?: boolean;
  expression: Expression;
  onChange?: (expression: string) => void;
  isStudioFriendly?: boolean;
};

export const ComplexExpression = ({
  disabled = false,
  expression,
  onChange,
  isStudioFriendly,
}: ComplexExpressionProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.root}>
      <StudioTextarea
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        value={stringifyData(expression.complexExpression)}
      />
      {!isStudioFriendly && <Alert>{t('right_menu.expressions_complex_expression_message')}</Alert>}
    </div>
  );
};
