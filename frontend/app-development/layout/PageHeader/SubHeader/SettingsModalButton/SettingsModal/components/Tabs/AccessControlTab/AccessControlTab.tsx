import type { ReactNode } from 'react';
import React from 'react';
import classes from './AccessControlTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { ErrorMessage, Link, Paragraph } from '@digdir/designsystemet-react';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { TabContent } from '../../TabContent';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { StudioHelpText } from '@studio/components';

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
        <StudioHelpText aria-label={t('settings_modal.access_control_tab_help_text_title')}>
          {t('settings_modal.access_control_tab_help_text_heading')}
        </StudioHelpText>
      </div>
      {displayContent()}
      <span className={classes.docsLinkText}>
        {t('settings_modal.access_control_tab_option_access_control_docs_link_text')}
      </span>
      <Link href={altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/logic/instantiation' })}>
        {t('settings_modal.access_control_tab_option_access_control_docs_link')}
      </Link>
    </TabContent>
  );
};
