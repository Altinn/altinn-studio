import React, { ReactNode, useState } from 'react';
import classes from './InputFields.module.css';
import { useTranslation } from 'react-i18next';
import { AppConfig } from 'app-shared/types/AppConfig';
import { InputField } from './InputField';

export type InputFieldsProps = {
  /**
   * The app configuration data
   */
  appConfig: AppConfig;
  /**
   * Function to save the updated data
   * @param appConfig the new app config
   * @returns void
   */
  onSave: (appConfig: AppConfig) => void;
};

/**
 * @component
 *    Displays the input fields used in the About Tab in the Settings Modal
 *
 * @property {AppConfig}[appConfig] - The app configuration data
 * @property {function}[onSave] - Function to save the updated data
 *
 * @returns {ReactNode} - The rendered component
 */
export const InputFields = ({ appConfig, onSave }: InputFieldsProps): ReactNode => {
  const { t } = useTranslation();

  const [appConfigState, setAppConfigState] = useState<AppConfig>(appConfig);

  return (
    <div className={classes.wrapper}>
      <InputField
        label={t('settings_modal.about_tab_repo_label')}
        description={t('settings_modal.about_tab_repo_description')}
        id='aboutRepoName'
        value={appConfig.repositoryName}
        readOnly
      />
      <InputField
        id='aboutNameField'
        label={t('settings_modal.about_tab_name_label')}
        description={t('settings_modal.about_tab_name_description')}
        value={appConfigState.serviceName}
        onChange={(serviceName: string) => setAppConfigState((ac) => ({ ...ac, serviceName }))}
        onBlur={() => onSave(appConfigState)}
        isValid={appConfigState.serviceName.length > 0}
        errorText={t('settings_modal.about_tab_name_error')}
      />
      <InputField
        id='aboutAltIdField'
        label={t('settings_modal.about_tab_alt_id_label')}
        description={t('settings_modal.about_tab_alt_id_description')}
        value={appConfigState.serviceId}
        onChange={(serviceId: string) => setAppConfigState((ac) => ({ ...ac, serviceId }))}
        onBlur={() => onSave(appConfigState)}
      />
    </div>
  );
};
