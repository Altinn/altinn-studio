import type { ReactNode } from 'react';
import React from 'react';
import { Alert, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { StudioCenter } from '@studio/components';

export type TabDataErrorProps = {
  children: ReactNode;
};

export const TabDataError = ({ children }: TabDataErrorProps): ReactNode => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <Alert severity='danger'>
        <Paragraph>{t('general.fetch_error_message')}</Paragraph>
        <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
        {children}
      </Alert>
    </StudioCenter>
  );
};
