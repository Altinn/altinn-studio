import React from 'react';
import type { ReactElement } from 'react';
import classes from './ErrorSummary.module.css';
import { StudioErrorSummary } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AppResourceFormError } from 'app-shared/types/AppResource';
import type { TranslationType } from 'app-development/features/appSettings/types/Translation';

type ErrorSummaryProps = {
  validationErrors: AppResourceFormError[];
  onClickErrorLink: (field: TranslationType) => void;
};

export function ErrorSummary({
  validationErrors,
  onClickErrorLink,
}: ErrorSummaryProps): ReactElement {
  const { t } = useTranslation();

  return (
    <StudioErrorSummary className={classes.errorSummary}>
      <StudioErrorSummary.Heading>
        {t('app_settings.about_tab_error_summary_header')}
      </StudioErrorSummary.Heading>
      <StudioErrorSummary.List>
        {validationErrors.map((error: AppResourceFormError) => {
          const href: string = getErrorSummaryHref(error);
          return (
            <StudioErrorSummary.Item key={JSON.stringify(error)}>
              <StudioErrorSummary.Link href={href} onClick={() => onClickErrorLink(error.field)}>
                {error.error}
              </StudioErrorSummary.Link>
            </StudioErrorSummary.Item>
          );
        })}
      </StudioErrorSummary.List>
    </StudioErrorSummary>
  );
}

function getErrorSummaryHref(error: AppResourceFormError): string {
  const isIndexUndefined: boolean = error.index === undefined;
  const isIndexNumber: boolean = typeof error.index === 'number';
  const isIndexString: boolean = typeof error.index === 'string';

  if (!isIndexUndefined && isIndexNumber) {
    return `#${error.field}-${error.index}`;
  }
  if (!isIndexUndefined && isIndexString) {
    return `#${error.field}-${error.index}`;
  }
  return `#${error.field}`;
}
