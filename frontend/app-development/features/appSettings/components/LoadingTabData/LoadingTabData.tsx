import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter } from '@studio/components';
import { Spinner } from '@digdir/designsystemet-react';

export function LoadingTabData(): ReactElement {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <Spinner data-size='xl' title={t('app_settings.loading_content')} />
    </StudioCenter>
  );
}
