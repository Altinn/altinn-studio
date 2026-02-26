import React from 'react';
import type { ReactElement } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { StudioValidationMessage } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { LoadingTabData } from '../../LoadingTabData';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabDataError } from '../../TabDataError';
import { InputFields } from './InputFields';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { AppConfigForm } from './AppConfigForm';
import { useAppMetadataMutation } from 'app-development/hooks/mutations/useAppMetadataMutation';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

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

  const { mutate: saveApplicationMetadata } = useAppMetadataMutation(org, app);
  const {
    status: applicationMetadataStatus,
    error: applicationMetadataError,
    data: appMetadata,
  } = useAppMetadataQuery(org, app);

  const setApplicationMetadata = (updatedConfig: ApplicationMetadata) => {
    saveApplicationMetadata(updatedConfig);
  };

  const { data: appConfigData, status: appConfigQueryStatus } = useAppConfigQuery(org, app);

  const { mutate: updateAppConfigMutation } = useAppConfigMutation(org, app);

  const handleSaveAppConfig = (updatedConfig: AppConfig) => {
    updateAppConfigMutation(updatedConfig);
  };

  switch (mergeQueryStatuses(applicationMetadataStatus, appConfigQueryStatus)) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {applicationMetadataError && (
            <StudioValidationMessage>{applicationMetadataError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    }
    case 'success': {
      return shouldDisplayFeature(FeatureFlag.AppMetadata) ? (
        <div className={classes.wrapper}>
          <AppConfigForm
            appConfig={appMetadata}
            saveAppConfig={(updatedAppConfig: ApplicationMetadata) =>
              setApplicationMetadata(updatedAppConfig)
            }
          />
        </div>
      ) : (
        <div className={classes.wrapper}>
          <InputFields appConfig={appConfigData} onSave={handleSaveAppConfig} />
        </div>
      );
    }
  }
}
