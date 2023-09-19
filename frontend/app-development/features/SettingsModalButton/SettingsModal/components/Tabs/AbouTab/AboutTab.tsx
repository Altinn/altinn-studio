import React, { ReactNode } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { Label, Paragraph } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { Buldings3Icon, PersonCircleIcon } from '@navikt/aksel-icons';

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

  return (
    <div>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      <Paragraph>{JSON.stringify(appConfig)}</Paragraph>
      <Paragraph>{org}</Paragraph>
      <Paragraph>{app}</Paragraph>
      <Divider marginless />
      <div className={classes.contentWrapper}>
        <Label as='p' spacing className={classes.label}>
          {t('settings_modal.about_tab_created_for')}
        </Label>
        <div className={classes.createdFor}>
          <Buldings3Icon className={classes.createdForIcon} />
          <Paragraph className={classes.paragraph}>TODO-Created for</Paragraph>
        </div>
        <Label as='p' spacing className={classes.label}>
          {t('settings_modal.about_tab_created_by')}
        </Label>
        <div className={classes.createdBy}>
          <PersonCircleIcon className={classes.createdByIcon} />
          <Paragraph className={classes.paragraph}>TODO-Created by</Paragraph>
        </div>
        <Paragraph>Dato: TODO-date</Paragraph>
      </div>
    </div>
  );
};
