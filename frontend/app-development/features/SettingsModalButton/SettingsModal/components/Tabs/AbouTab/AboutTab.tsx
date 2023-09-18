import React, { ReactNode } from 'react';
import classes from './AboutTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { Paragraph } from '@digdir/design-system-react';

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
    <div className={classes.wrapper}>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      <Paragraph>{JSON.stringify(appConfig)}</Paragraph>
      <Paragraph>{org}</Paragraph>
      <Paragraph>{app}</Paragraph>
    </div>
  );
};
