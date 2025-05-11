import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './SetupTabInputFields.module.css';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { StudioSwitch } from '@studio/components';

export type SetupTabInputFieldsProps = {
  appMetadata: ApplicationMetadata;
};

export function SetupTabInputFields({ appMetadata }: SetupTabInputFieldsProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleSaveAutoDeleteOnProcessEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      autoDeleteOnProcessEnd: e.target.checked,
    });
  };

  const handleSaveHideSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      messageBoxConfig: {
        ...appMetadata.messageBoxConfig,
        hideSettings: { ...appMetadata.messageBoxConfig, hideAlways: e.target.checked },
      },
    });
  };

  const handleSaveEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      copyInstanceSettings: {
        ...appMetadata.copyInstanceSettings,
        enabled: e.target.checked,
      },
    });
  };

  const handleSaveShow = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      onEntry: {
        ...appMetadata.onEntry,
        show: e.target.checked ? 'select-instance' : undefined,
      },
    });
  };

  return (
    <>
      <StudioSwitch
        label={t('app_settings.setup_tab_switch_autoDeleteOnProcessEnd')}
        className={classes.switch}
        checked={appMetadata?.autoDeleteOnProcessEnd}
        onChange={handleSaveAutoDeleteOnProcessEnd}
      />
      <StudioSwitch
        label={t('app_settings.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways')}
        className={classes.switch}
        checked={appMetadata?.messageBoxConfig?.hideSettings?.hideAlways}
        onChange={handleSaveHideSettings}
      />
      <StudioSwitch
        label={t('app_settings.setup_tab_switch_copyInstanceSettings_enabled')}
        className={classes.switch}
        checked={appMetadata?.copyInstanceSettings?.enabled}
        onChange={handleSaveEnabled}
      />
      <StudioSwitch
        label={t('app_settings.setup_tab_switch_onEntry_show')}
        className={classes.switch}
        checked={appMetadata?.onEntry?.show === 'select-instance'}
        onChange={handleSaveShow}
      />
    </>
  );
}
