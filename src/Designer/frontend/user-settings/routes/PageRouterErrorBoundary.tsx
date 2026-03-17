import React, { type ReactElement } from 'react';
import { StudioParagraph, StudioPageError, StudioLink } from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';

export const ErrorBoundary = (): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioPageError
      title={t('general.page_error_title')}
      message={
        <StudioParagraph>
          <Trans
            i18nKey={'general.page_error_message'}
            components={{
              a: <StudioLink href='/info/contact'> </StudioLink>,
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
