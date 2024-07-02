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
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const AccessControlTab = (): ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

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
              {t('settings_modal.access_control_tab_checkbox_description')}
            </Paragraph>
            <SelectAllowedPartyTypes appMetadata={appMetadata} />
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
