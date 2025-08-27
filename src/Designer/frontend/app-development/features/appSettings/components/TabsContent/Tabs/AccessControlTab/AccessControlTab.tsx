import React from 'react';
import type { ReactElement } from 'react';
import classes from './AccessControlTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabPageHeader } from '../../TabPageHeader';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { StudioLink, StudioParagraph, StudioValidationMessage } from 'libs/studio-components/src';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';
import { altinnDocsUrl } from 'app-shared/ext-urls';

export function AccessControlTab(): ReactElement {
  const { t } = useTranslation();
  return (
    <TabPageWrapper>
      <TabPageHeader text={t('app_settings.access_control_tab_heading')} />
      <AccessControlTabContent />
    </TabPageWrapper>
  );
}

function AccessControlTabContent(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: appMetadata,
    status: appMetadataStatus,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  switch (appMetadataStatus) {
    case 'pending': {
      return <LoadingTabData />;
    }
    case 'error': {
      return (
        <TabDataError>
          {appMetadataError && (
            <StudioValidationMessage>{appMetadataError.message}</StudioValidationMessage>
          )}
        </TabDataError>
      );
    }
    case 'success': {
      return (
        <>
          <SelectAllowedPartyTypes appMetadata={appMetadata} />
          <AccessControlDocumentation />
        </>
      );
    }
  }
}

function AccessControlDocumentation(): ReactElement {
  const { t } = useTranslation();

  return (
    <div>
      <StudioParagraph className={classes.docsLinkText}>
        {t('app_settings.access_control_tab_option_access_control_docs_link_text')}
      </StudioParagraph>
      <StudioLink
        href={altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/logic/instantiation' })}
        target='_blank'
        rel='noopener noreferrer'
      >
        {t('app_settings.access_control_tab_option_access_control_docs_link')}
      </StudioLink>
    </div>
  );
}
