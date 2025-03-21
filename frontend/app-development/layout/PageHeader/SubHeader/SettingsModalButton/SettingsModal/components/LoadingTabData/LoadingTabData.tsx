import type { ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter } from '@studio/components-legacy';
import { Spinner } from '@digdir/designsystemet-react';

export const LoadingTabData = (): ReactNode => {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <Spinner size='xlarge' variant='interaction' title={t('settings_modal.loading_content')} />
    </StudioCenter>
  );
};
