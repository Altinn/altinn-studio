import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TabPageWrapper } from '../../TabPageWrapper';
import { TabPageHeader } from '../../TabPageHeader';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { StudioValidationMessage } from '@studio/components';
import { SelectAllowedPartyTypes } from './SelectAllowedPartyTypes';

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
      return <SelectAllowedPartyTypes appMetadata={appMetadata} />;
    }
  }
}
