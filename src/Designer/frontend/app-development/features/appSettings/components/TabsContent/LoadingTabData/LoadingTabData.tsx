import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCenter, StudioSpinner } from 'libs/studio-components/src';

export function LoadingTabData(): ReactElement {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <StudioSpinner
        data-size='xl'
        spinnerTitle={t('app_settings.loading_content')}
        aria-hidden={true}
      />
    </StudioCenter>
  );
}
