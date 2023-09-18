import React, { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { InputField } from '../../InputField';

export type AboutTabProps = {
  /**
   * The app config to show
   */
  appConfig: AppConfig;
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the config for an app
 *
 * @property {AppConfig}[appConfig] - The app config to show
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AboutTab = ({ appConfig, org, app }: AboutTabProps): ReactNode => {
  const { t } = useTranslation();

  const [appConfigState, setAppConfigState] = useState<AppConfig>(appConfig);

  const handleSaveAppConfig = () => {
    console.log(appConfigState);
  };

  return (
    <div>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      <InputField
        id='aboutNameField'
        label={t('settings_modal.about_tab_name_label')}
        description={t('settings_modal.about_tab_name_description')}
        value={appConfigState.serviceName}
        onChange={(serviceName: string) => setAppConfigState((ac) => ({ ...ac, serviceName }))}
        onBlur={handleSaveAppConfig}
        isValid={appConfigState.serviceName.length > 0}
        errorText={t('settings_modal.about_tab_name_error')}
        type='textfield'
      />
      <InputField
        id='aboutAltIdField'
        label={t('settings_modal.about_tab_alt_id_label')}
        description={t('settings_modal.about_tab_alt_id_description')}
        value={appConfigState.serviceId}
        onChange={(serviceId: string) => setAppConfigState((ac) => ({ ...ac, serviceId }))}
        onBlur={handleSaveAppConfig}
        type='textfield'
      />
      <InputField
        id='aboutRepoName'
        label={t('settings_modal.about_tab_repo_label')}
        description={t('settings_modal.about_tab_repo_description')}
        value={appConfigState.repositoryName}
        type='textfield'
        readOnly
      />
      <InputField
        id='aboutDescriptionId'
        label={t('settings_modal.about_tab_description_label')}
        description={t('settings_modal.about_tab_description_description')}
        value={appConfigState.serviceDescription}
        onChange={(serviceDescription: string) =>
          setAppConfigState((ac) => ({ ...ac, serviceDescription }))
        }
        onBlur={handleSaveAppConfig}
        type='textarea'
      />
    </div>
  );
};
