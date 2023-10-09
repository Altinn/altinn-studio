import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Center } from 'app-shared/components/Center';
import { Spinner } from '@digdir/design-system-react';

export const LoadingTabData = (): ReactNode => {
  const { t } = useTranslation();
  return (
    <Center>
      <Spinner size='2xLarge' variant='interaction' title={t('settings_modal.loading_content')} />
    </Center>
  );
};
