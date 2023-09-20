import React, { ReactNode, useState } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { Label, Paragraph } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { PersonCircleIcon } from '@navikt/aksel-icons';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';
import { Repository } from 'app-shared/types/Repository';
import { formatDateToDateAndTimeString } from 'app-development/utils/dateUtils';
import { InputField } from '../../InputField';
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
  repository: Repository;
  createdBy: string;
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
export const AboutTab = ({
  appConfig,
  org,
  app,
  repository,
  createdBy,
}: AboutTabProps): ReactNode => {
  const { t } = useTranslation();

  const repositoryType = getRepositoryType(org, app);

  const [appConfigState, setAppConfigState] = useState<AppConfig>({
    ...appConfig,
    serviceId: appConfig?.serviceId ?? '',
  });

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
      <div className={classes.contentWrapper}>
        <Label as='p' spacing className={classes.label}>
          {t(
            repositoryType === RepositoryType.Datamodels
              ? 'settings_modal.about_tab_created_for_repo'
              : 'settings_modal.about_tab_created_for_service'
          )}
        </Label>
        <div className={classes.createdFor}>
          <img src={repository.owner.avatar_url} className={classes.avatar} alt='' />
          <Paragraph className={classes.paragraph}>
            {repository.owner.full_name || repository.owner.login}
          </Paragraph>
        </div>
        <Label as='p' spacing className={classes.label}>
          {t('settings_modal.about_tab_created_by')}
        </Label>
        <div className={classes.createdBy}>
          <PersonCircleIcon className={classes.createdByIcon} />
          <Paragraph className={classes.paragraph}>{createdBy}</Paragraph>
        </div>
        <Paragraph>
          {t('settings_modal.about_tab_created_date', {
            date: formatDateToDateAndTimeString(repository.created_at),
          })}
        </Paragraph>
      </div>
    </div>
  );
};
