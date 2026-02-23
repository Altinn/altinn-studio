import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioCard,
  StudioParagraph,
  StudioSwitch,
  StudioValidationMessage,
} from '@studio/components';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { useAppSettingsQuery, useDeployPermissionsQuery } from 'app-development/hooks/queries';
import { useUpdateAppSettingsMutation } from 'app-development/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './RunTab.module.css';

export function RunTab(): ReactElement {
  const { t } = useTranslation();

  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.run_tab_heading')} />
      <RunTabContent />
    </TabPageWrapper>
  );
}

function RunTabContent(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const {
    status: appSettingsStatus,
    data: appSettings,
    error: appSettingsError,
  } = useAppSettingsQuery();
  const { data: deployPermissions } = useDeployPermissionsQuery(org, app, {
    hideDefaultError: true,
  });
  const { mutate: updateAppSettings, isPending: isPendingUpdate } = useUpdateAppSettingsMutation();
  const hasDeployPermission = Boolean(deployPermissions?.length);

  const handleUpdateInactivitySetting = (event: ChangeEvent<HTMLInputElement>) => {
    if (!hasDeployPermission || isPendingUpdate) {
      return;
    }

    updateAppSettings({ undeployOnInactivity: event.target.checked });
  };

  switch (appSettingsStatus) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {appSettingsError && (
            <StudioValidationMessage>{appSettingsError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    }
    case 'success': {
      return (
        <StudioCard>
          <div className={classes.settingSection}>
            <StudioSwitch
              label={t('app_settings.run_tab_switch_undeploy_on_inactivity')}
              description={t('app_settings.run_tab_switch_undeploy_on_inactivity_description')}
              className={classes.switch}
              checked={appSettings?.undeployOnInactivity ?? false}
              disabled={isPendingUpdate || !hasDeployPermission}
              onChange={handleUpdateInactivitySetting}
              position='end'
              data-size='md'
            />
            <StudioAlert data-color='info' className={classes.settingInfoAlert}>
              <StudioParagraph>{t('app_settings.run_tab_info')}</StudioParagraph>
            </StudioAlert>
          </div>
        </StudioCard>
      );
    }
  }
}
