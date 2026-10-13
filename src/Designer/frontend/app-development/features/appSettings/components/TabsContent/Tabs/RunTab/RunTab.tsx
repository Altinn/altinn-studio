import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioValidationMessage } from '@studio/components';
import { TabPageHeader } from '../../TabPageHeader';
import { TabPageWrapper } from '../../TabPageWrapper';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { useAppSettingsQuery, useDeployPermissionsQuery } from 'app-development/hooks/queries';
import { useUpdateAppSettingsMutation } from 'app-development/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { InactivityUndeployForm } from './InactivityUndeployForm';

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
        <InactivityUndeployForm
          appSettings={appSettings}
          canEdit={hasDeployPermission}
          isSaving={isPendingUpdate}
          onSave={(payload) => updateAppSettings(payload)}
        />
      );
    }
  }
}
