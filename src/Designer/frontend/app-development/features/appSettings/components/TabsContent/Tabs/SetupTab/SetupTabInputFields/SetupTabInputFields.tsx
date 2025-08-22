import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './SetupTabInputFields.module.css';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { StudioCard, StudioSwitch } from '@studio/components';

export type SetupTabInputFieldsProps = {
  appMetadata: ApplicationMetadata;
};

export function SetupTabInputFields({ appMetadata }: SetupTabInputFieldsProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleSaveAutoDeleteOnProcessEnd = (e: ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      autoDeleteOnProcessEnd: e.target.checked,
    });
  };

  const handleSaveHideSettings = (e: ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      messageBoxConfig: {
        ...appMetadata.messageBoxConfig,
        hideSettings: {
          ...appMetadata.messageBoxConfig?.hideSettings,
          hideAlways: e.target.checked,
        },
      },
    });
  };

  const handleSaveEnabled = (e: ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      copyInstanceSettings: {
        ...appMetadata.copyInstanceSettings,
        enabled: e.target.checked,
      },
    });
  };

  const handleSaveShow = (e: ChangeEvent<HTMLInputElement>) => {
    updateAppMetadataMutation({
      ...appMetadata,
      onEntry: {
        ...appMetadata.onEntry,
        show: e.target.checked ? 'select-instance' : undefined,
      },
    });
  };

  const renderConfigSwitch = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (e: ChangeEvent<HTMLInputElement>) => void,
  ) => (
    <StudioCard className={classes.card}>
      <StudioSwitch
        label={label}
        description={description}
        className={classes.switch}
        checked={checked}
        onChange={onChange}
        position='end'
        data-size='md'
      />
    </StudioCard>
  );

  return (
    <>
      {renderConfigSwitch(
        t('app_settings.setup_tab_switch_autoDeleteOnProcessEnd'),
        t('app_settings.setup_tab_switch_autoDeleteOnProcessEnd_description'),
        appMetadata?.autoDeleteOnProcessEnd,
        handleSaveAutoDeleteOnProcessEnd,
      )}
      {renderConfigSwitch(
        t('app_settings.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways'),
        t('app_settings.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways_description'),
        appMetadata?.messageBoxConfig?.hideSettings?.hideAlways,
        handleSaveHideSettings,
      )}
      {renderConfigSwitch(
        t('app_settings.setup_tab_switch_copyInstanceSettings_enabled'),
        t('app_settings.setup_tab_switch_copyInstanceSettings_enabled_description'),
        appMetadata?.copyInstanceSettings?.enabled,
        handleSaveEnabled,
      )}
      {renderConfigSwitch(
        t('app_settings.setup_tab_switch_onEntry_show'),
        t('app_settings.setup_tab_switch_onEntry_show_description'),
        appMetadata?.onEntry?.show === 'select-instance',
        handleSaveShow,
      )}
    </>
  );
}
