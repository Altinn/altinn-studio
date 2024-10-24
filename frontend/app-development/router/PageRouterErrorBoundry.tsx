import React, { type ReactElement } from 'react';
import { StudioPageError, StudioParagraph } from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from '@digdir/designsystemet-react';

export const ErrorBoundary = (props: any): ReactElement => {
  const { t } = useTranslation();

  console.log('props', props);
  return (
    <StudioPageError
      title={t('general.page_error_title')}
      message={
        <StudioParagraph>
          <Trans
            i18nKey={'general.page_error_message'}
            components={{
              a: <Link href='/contact'> </Link>,
            }}
          />
        </StudioParagraph>
      }
    />
  );
};

export const AppRouteErrorBoundary = ErrorBoundary;
export const NotFoundRouteErrorBoundary = ErrorBoundary;
export const RouteErrorBoundary = ErrorBoundary;
