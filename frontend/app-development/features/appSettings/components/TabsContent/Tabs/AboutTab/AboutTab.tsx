import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { StudioValidationMessage } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { getRepositoryType } from 'app-shared/utils/repository';
import type { RepositoryType } from 'app-shared/types/global';
import type { AppConfig, AppConfigNew } from 'app-shared/types/AppConfig';
import { useAppMetadataQuery, useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { LoadingTabData } from '../../LoadingTabData';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabDataError } from '../../TabDataError';
import { CreatedFor } from './CreatedFor';
import { InputFields } from './InputFields';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { AppConfigForm } from './AppConfigForm';

export function AboutTab(): ReactElement {
  const { t } = useTranslation();

  return (
    <TabPageWrapper hasInlineSpacing={false}>
      <div className={classes.headingWrapper}>
        <TabPageHeader text={t('app_settings.about_tab_heading')} />
      </div>
      <AboutTabContent />
    </TabPageWrapper>
  );
}

function AboutTabContent(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const repositoryType: RepositoryType = getRepositoryType(org, app);

  // TODO - This is a temporary solution to handle the new app resource structure. Will be replaced with API calls when available.
  const [appConfigNew, setAppConfigNew] = useState<AppConfigNew>(mockAppConfig);

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

  const handleSaveAppConfig = (updatedConfig: AppConfig) => {
    updateAppConfigMutation(updatedConfig);
  };

  switch (mergeQueryStatuses(appConfigStatus, repositoryStatus, applicationMetadataStatus)) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {appConfigError && (
            <StudioValidationMessage>{appConfigError.message}</StudioValidationMessage>
          )}
          {repositoryError && (
            <StudioValidationMessage>{repositoryError.message}</StudioValidationMessage>
          )}
          {applicationMetadataError && (
            <StudioValidationMessage>{applicationMetadataError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    }
    case 'success': {
      return shouldDisplayFeature(FeatureFlag.AppMetadata) ? (
        <div className={classes.wrapper}>
          <CreatedFor
            repositoryType={repositoryType}
            repository={repositoryData}
            authorName={applicationMetadataData?.createdBy}
          />
          <AppConfigForm
            appConfig={appConfigNew}
            saveAppConfig={(updatedAppConfig: AppConfigNew) => setAppConfigNew(updatedAppConfig)}
          />
        </div>
      ) : (
        <div className={classes.wrapper}>
          <CreatedFor
            repositoryType={repositoryType}
            repository={repositoryData}
            authorName={applicationMetadataData?.createdBy}
          />
          <InputFields appConfig={appConfigData} onSave={handleSaveAppConfig} />
        </div>
      );
    }
  }
}

const mockAppConfig: AppConfigNew = {
  resourceType: 'altinnapp',
  repositoryName: 'example-repo',
  serviceName: { nb: 'test', nn: '', en: '' },
  serviceId: 'example-service-id',
  description: { nb: 'Test Tjeneste', nn: '', en: '' },
};
