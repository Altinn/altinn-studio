import type { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { ErrorMessage, List } from '@digdir/design-system-react';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../../StudioExpressionContext';
import classes from './SubExpressionErrors.module.css';

export type SubExpressionErrorsProps = {
  errorKeys: ExpressionErrorKey[];
};

export const SubExpressionErrors = ({ errorKeys }: SubExpressionErrorsProps) => {
  const { texts } = useContext(StudioExpressionContext);

  return (
    <div className={classes.subExpressionErrors}>
      <ErrorMessage size='small'>{texts.errorListHeader}</ErrorMessage>
      <List size='small'>
        {errorKeys.map((errorKey) => (
          <List.Item key={errorKey}>
            <ErrorMessage size='small'>{texts.errorMessages[errorKey]}</ErrorMessage>
          </List.Item>
        ))}
      </List>
      <ErrorMessage size='small'>{texts.errorListFooter}</ErrorMessage>
    </div>
  );
};
