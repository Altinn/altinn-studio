import React, { ReactNode, useState } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { InputField } from '../../InputField';
import { Divider } from 'app-shared/primitives';
import { useAppConfigMutation } from 'app-development/hooks/mutations';

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

  // Mutation function to update app config
  const { mutate: updateAppConfigMutation } = useAppConfigMutation(org, app);

  const handleSaveAppConfig = () => {
    updateAppConfigMutation(appConfigState);
  };

  return (
    <div>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      <div className={classes.contentWrapper}>
        <InputField
          id='aboutRepoName'
          label={t('settings_modal.about_tab_repo_label')}
          description={t('settings_modal.about_tab_repo_description')}
          value={appConfigState.repositoryName}
          readOnly
        />
        <InputField
          id='aboutNameField'
          label={t('settings_modal.about_tab_name_label')}
          description={t('settings_modal.about_tab_name_description')}
          value={appConfigState.serviceName}
          onChange={(serviceName: string) => setAppConfigState((ac) => ({ ...ac, serviceName }))}
          onBlur={handleSaveAppConfig}
          isValid={appConfigState.serviceName.length > 0}
          errorText={t('settings_modal.about_tab_name_error')}
        />
        <InputField
          id='aboutAltIdField'
          label={t('settings_modal.about_tab_alt_id_label')}
          description={t('settings_modal.about_tab_alt_id_description')}
          value={appConfigState.serviceId}
          onChange={(serviceId: string) => setAppConfigState((ac) => ({ ...ac, serviceId }))}
          onBlur={handleSaveAppConfig}
        />
      </div>
      <Divider marginless />
    </div>
  );
};
