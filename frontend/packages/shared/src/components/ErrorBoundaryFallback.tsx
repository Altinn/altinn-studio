import React from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { Alert, Button, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { Center } from './Center';
import classes from './ErrorBoundaryFallback.module.css';

export type ErrorBoundaryFallbackProps = {
  error: Error;
}

export const ErrorBoundaryFallback = ({ error }: ErrorBoundaryFallbackProps) => {
  const { t } = useTranslation();
  const { resetBoundary } = useErrorBoundary();

  return (
    <Center className={classes.container}>
      <Alert severity='danger' className={classes.alert}>
        <Paragraph>{t('general.error_message')}</Paragraph>
        {!_useIsProdHack && <ErrorMessage>{error.message}</ErrorMessage>}
        <Center>
          <Button onClick={resetBoundary} size='small'>{t('general.try_again')}</Button>
        </Center>
      </Alert>
    </Center>
  );
};
