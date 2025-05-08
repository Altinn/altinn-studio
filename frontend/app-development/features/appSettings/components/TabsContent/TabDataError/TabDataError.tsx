import React from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter, StudioAlert, StudioParagraph } from '@studio/components';

export type TabDataErrorProps = {
  children: ReactNode;
};

export const TabDataError = ({ children }: TabDataErrorProps): ReactNode => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <StudioAlert data-color='danger'>
        <StudioParagraph>{t('general.fetch_error_message')}</StudioParagraph>
        <StudioParagraph>{t('general.error_message_with_colon')}</StudioParagraph>
        {children}
      </StudioAlert>
    </StudioCenter>
  );
};
