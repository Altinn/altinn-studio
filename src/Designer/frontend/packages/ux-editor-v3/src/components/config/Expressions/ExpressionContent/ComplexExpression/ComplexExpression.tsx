import classes from './ComplexExpression.module.css';
import { useTranslation } from 'react-i18next';
import type { Expression } from '../../../../../types/Expressions';
import { stringifyData } from '../../../../../utils/jsonUtils';
import { StudioTextarea, StudioAlert } from '@studio/components';

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
      {!isStudioFriendly && (
        <StudioAlert>{t('right_menu.expressions_complex_expression_message')}</StudioAlert>
      )}
    </div>
  );
};
