import React from 'react';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { Divider } from 'app-shared/primitives';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useAppMetadataQuery, useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { InputFields } from './InputFields';
import { CreatedFor } from './CreatedFor';
import { TabContent } from '../../TabContent';
import { usePreviewContext } from '../../../../../../contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const AboutTab = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const repositoryType = getRepositoryType(org, app);

  const { doReloadPreview } = usePreviewContext();

  const {
    status: appConfigStatus,
    data: appConfigData,
    error: appConfigError,
  } = useAppConfigQuery(org, app);
  const {
    status: repositoryStatus,
    data: repositoryData,
    error: repositoryError,
  } = useRepoMetadataQuery(org, app);
  const {
    status: applicationMetadataStatus,
    data: applicationMetadataData,
    error: applicationMetadataError,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppConfigMutation } = useAppConfigMutation(org, app);

  const handleSaveAppConfig = (appConfig: AppConfig) => {
    if (appConfigData.serviceName !== appConfig.serviceName) {
      doReloadPreview();
    }
    updateAppConfigMutation(appConfig);
  };

  const displayContent = () => {
    switch (mergeQueryStatuses(appConfigStatus, repositoryStatus, applicationMetadataStatus)) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appConfigError && <ErrorMessage>{appConfigError.message}</ErrorMessage>}
            {repositoryError && <ErrorMessage>{repositoryError.message}</ErrorMessage>}
            {applicationMetadataError && (
              <ErrorMessage>{applicationMetadataError.message}</ErrorMessage>
            )}
          </TabDataError>
        );
      }
      case 'success': {
        return (
          <>
            <InputFields appConfig={appConfigData} onSave={handleSaveAppConfig} />
            <Divider marginless />
            <CreatedFor
              repositoryType={repositoryType}
              repository={repositoryData}
              authorName={applicationMetadataData?.createdBy}
            />
          </>
        );
      }
    }
  };
  return (
    <TabContent>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};
