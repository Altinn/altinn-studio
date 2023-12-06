import React from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import { Trans, useTranslation } from 'react-i18next';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { Alert, Button, ErrorMessage, Link, Paragraph } from '@digdir/design-system-react';
import { StudioCenter } from '@studio/components';
import classes from './ErrorBoundaryFallback.module.css';

export type ErrorBoundaryFallbackProps = {
  error: Error;
};

export const ErrorBoundaryFallback = ({ error }: ErrorBoundaryFallbackProps) => {
  const { t } = useTranslation();
  const { resetBoundary } = useErrorBoundary();

  return (
    <StudioCenter className={classes.container}>
      <Alert severity='danger' className={classes.alert}>
        <Paragraph>
          <Trans
            i18nKey={'general.error_message'}
            components={{ a: <Link href='/contact'> </Link> }}
          />
        </Paragraph>
        {!_useIsProdHack && <ErrorMessage>{error.message}</ErrorMessage>}
        <StudioCenter>
          <Button onClick={resetBoundary} size='small'>
            {t('general.try_again')}
          </Button>
        </StudioCenter>
      </Alert>
    </StudioCenter>
  );
};
