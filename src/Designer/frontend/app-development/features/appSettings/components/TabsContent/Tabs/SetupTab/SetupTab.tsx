import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioValidationMessage } from 'libs/studio-components/src';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabDataError } from '../../TabDataError';
import { SetupTabInputFields } from './SetupTabInputFields';

export function SetupTab(): ReactElement {
  const { t } = useTranslation();

  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.setup_tab_heading')} />
      <SetupTabContent />
    </TabPageWrapper>
  );
}

function SetupTabContent(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  switch (appMetadataStatus) {
    case 'pending':
      return <LoadingTabData />;
    case 'error':
      return (
        <TabDataError>
          {appMetadataError && (
            <StudioValidationMessage>{appMetadataError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    case 'success':
      return <SetupTabInputFields appMetadata={appMetadata} />;
  }
}
