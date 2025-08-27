import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter, StudioAlert, StudioParagraph } from 'libs/studio-components/src';

export type TabDataErrorProps = {
  children: ReactNode;
};

export function TabDataError({ children }: TabDataErrorProps): ReactElement {
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
}
