import React from 'react';
import type { CodeListMapError } from './types/CodeListMapError';
import { StudioErrorSummary } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type ErrorsProps = {
  errors: CodeListMapError[];
};

export function Errors({ errors }: ErrorsProps): React.ReactNode {
  const { t } = useTranslation();

  if (errors.length) {
    return (
      <StudioErrorSummary>
        <StudioErrorSummary.Heading>
          {t('app_content_library.code_lists.errors')}
        </StudioErrorSummary.Heading>
        <StudioErrorSummary.List>
          {errors.map((error) => (
            <StudioErrorSummary.Item key={error}>
              {t(`app_content_library.code_lists.error.${error}`)}
            </StudioErrorSummary.Item>
          ))}
        </StudioErrorSummary.List>
      </StudioErrorSummary>
    );
  } else return null;
}
