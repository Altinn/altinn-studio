import React, { forwardRef } from 'react';
import type { ReactElement } from 'react';
import classes from './ErrorSummary.module.css';
import { StudioErrorSummary } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';

export type ErrorSummaryProps = {
  validationErrors: AppConfigFormError[];
};

export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(
  ({ validationErrors }, ref): ReactElement => {
    const { t } = useTranslation();

    return (
      <StudioErrorSummary ref={ref} className={classes.errorSummary}>
        <StudioErrorSummary.Heading>
          {t('app_settings.about_tab_error_summary_header')}
        </StudioErrorSummary.Heading>
        <StudioErrorSummary.List>
          <ErrorListItems validationErrors={validationErrors} />
        </StudioErrorSummary.List>
      </StudioErrorSummary>
    );
  },
);

ErrorSummary.displayName = 'ErrorSummary';

type ErrorListItemsProps = {
  validationErrors: AppConfigFormError[];
};
function ErrorListItems({ validationErrors }: ErrorListItemsProps): ReactElement[] {
  return validationErrors.map((error: AppConfigFormError) => {
    const href: string = getErrorSummaryHref(error);
    return (
      <StudioErrorSummary.Item key={JSON.stringify(error)}>
        <StudioErrorSummary.Link href={href}>{error.error}</StudioErrorSummary.Link>
      </StudioErrorSummary.Item>
    );
  });
}

function getErrorSummaryHref(error: AppConfigFormError): string {
  const isIndexUndefined: boolean = error.index === undefined;

  if (!isIndexUndefined) {
    return `#${error.field}-${error.index}`;
  }
  return `#${error.field}`;
}
