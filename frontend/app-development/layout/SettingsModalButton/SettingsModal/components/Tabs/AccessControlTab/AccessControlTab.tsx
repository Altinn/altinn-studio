import type { ReactNode } from 'react';
import React from 'react';
import classes from './AccessControlTab.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { ErrorMessage, HelpText, Link, Paragraph } from '@digdir/design-system-react';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { TabContent } from '../../TabContent';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';

export type AccessControlTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the access control for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AccessControlTab = ({ org, app }: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();

  const {
    data: appMetadata,
    status: appMetadataStatus,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        return (
          <>
            <TabHeader text={t('settings_modal.access_control_tab_checkbox_legend_label')} />
            <Paragraph size='medium'>
              <span>{t('settings_modal.access_control_tab_checkbox_description')}</span>
            </Paragraph>
            <SelectAllowedPartyTypes org={org} app={app} appMetadata={appMetadata} />
          </>
        );
      }
    }
  };
  return (
    <TabContent>
      <div className={classes.tabHeaderContent}>
        <TabHeader text={t('settings_modal.access_control_tab_heading')} />
        <HelpText title={t('settings_modal.access_control_tab_help_text_title')} placement='top'>
          {t('settings_modal.access_control_tab_help_text_heading')}
        </HelpText>
      </div>
      {displayContent()}
      <span className={classes.docsLinkText}>
        {t('settings_modal.access_control_tab_option_access_control_docs_link_text')}
      </span>
      <Trans i18nKey={'settings_modal.access_control_tab_option_access_control_docs_link'}>
        <Link>documentation</Link>
      </Trans>
    </TabContent>
  );
};
