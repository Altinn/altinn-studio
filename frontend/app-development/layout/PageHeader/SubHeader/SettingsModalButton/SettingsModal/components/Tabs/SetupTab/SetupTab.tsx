import type { ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { TabHeader } from '../../TabHeader';
import { SetupTabContent } from './SetupTabContent';
import { TabContent } from '../../TabContent';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const SetupTab = (): ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'pending':
        return <LoadingTabData />;
      case 'error':
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      case 'success':
        return <SetupTabContent appMetadata={appMetadata} />;
    }
  };

  return (
    <TabContent>
      <TabHeader text={t('settings_modal.setup_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};
