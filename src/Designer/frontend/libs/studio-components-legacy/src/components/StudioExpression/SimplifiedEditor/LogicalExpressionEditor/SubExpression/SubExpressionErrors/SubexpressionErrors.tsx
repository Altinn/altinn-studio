import type { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { ErrorMessage, List } from '@digdir/designsystemet-react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../StudioExpressionContext';
import classes from './SubexpressionErrors.module.css';

export type SubexpressionErrorsProps = {
  errorKeys: ExpressionErrorKey[];
};

export const SubexpressionErrors = ({
  errorKeys,
}: SubexpressionErrorsProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  return (
    <div className={classes.subexpressionErrors}>
      <ErrorMessage size='small'>{texts.errorListHeader}</ErrorMessage>
      <List.Root size='small'>
        <List.Unordered>
          {errorKeys.map((errorKey) => (
            <List.Item key={errorKey}>
              <ErrorMessage size='small'>{texts.errorMessages[errorKey]}</ErrorMessage>
            </List.Item>
          ))}
        </List.Unordered>
      </List.Root>
      <ErrorMessage size='small'>{texts.errorListFooter}</ErrorMessage>
    </div>
  );
};
