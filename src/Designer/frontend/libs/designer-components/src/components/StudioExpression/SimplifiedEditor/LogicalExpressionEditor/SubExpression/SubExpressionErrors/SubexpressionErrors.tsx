import type { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';
import { ErrorSummary } from '@digdir/designsystemet-react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../StudioExpressionContext';

export type SubexpressionErrorsProps = {
  errorKeys: ExpressionErrorKey[];
};

export const SubexpressionErrors = ({
  errorKeys,
}: SubexpressionErrorsProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  return (
    <ErrorSummary>
      <ErrorSummary.Heading>{texts.errorListHeader}</ErrorSummary.Heading>
      <ErrorSummary.List>
        {errorKeys.map((errorKey) => (
          <ErrorSummary.Item key={errorKey}>{texts.errorMessages[errorKey]}</ErrorSummary.Item>
        ))}
      </ErrorSummary.List>
    </ErrorSummary>
  );
};
