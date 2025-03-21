import type { ReactNode } from 'react';
import React from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { StudioCenter, StudioError } from '@studio/components-legacy';

export type TabDataErrorProps = {
  children: ReactNode;
};

export const TabDataError = ({ children }: TabDataErrorProps): ReactNode => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <StudioError>
        <Paragraph>{t('general.fetch_error_message')}</Paragraph>
        <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
        {children}
      </StudioError>
    </StudioCenter>
  );
};
