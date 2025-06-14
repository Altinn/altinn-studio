import React, { forwardRef } from 'react';
import type { ReactElement } from 'react';
import classes from './ErrorSummary.module.css';
import { StudioErrorSummary } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import type { TranslationType } from 'app-development/features/appSettings/types/Translation';

export type ErrorSummaryProps = {
  validationErrors: AppResourceFormError[];
  onClickErrorLink: (field: TranslationType) => void;
};

export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(
  ({ validationErrors, onClickErrorLink }, ref): ReactElement => {
    const { t } = useTranslation();

    return (
      <StudioErrorSummary ref={ref} className={classes.errorSummary}>
        <StudioErrorSummary.Heading>
          {t('app_settings.about_tab_error_summary_header')}
        </StudioErrorSummary.Heading>
        <StudioErrorSummary.List>
          <ErrorListItems validationErrors={validationErrors} onClickErrorLink={onClickErrorLink} />
        </StudioErrorSummary.List>
      </StudioErrorSummary>
    );
  },
);

ErrorSummary.displayName = 'ErrorSummary';

type ErrorListItemsProps = {
  validationErrors: AppResourceFormError[];
  onClickErrorLink: (field: TranslationType) => void;
};
function ErrorListItems({
  validationErrors,
  onClickErrorLink,
}: ErrorListItemsProps): ReactElement[] {
  return validationErrors.map((error: AppResourceFormError) => {
    const href: string = getErrorSummaryHref(error);
    return (
      <StudioErrorSummary.Item key={JSON.stringify(error)}>
        <StudioErrorSummary.Link href={href} onClick={() => onClickErrorLink(error.field)}>
          {error.error}
        </StudioErrorSummary.Link>
      </StudioErrorSummary.Item>
    );
  });
}

function getErrorSummaryHref(error: AppResourceFormError): string {
  const isIndexUndefined: boolean = error.index === undefined;

  if (!isIndexUndefined) {
    return `#${error.field}-${error.index}`;
  }
  return `#${error.field}`;
}
