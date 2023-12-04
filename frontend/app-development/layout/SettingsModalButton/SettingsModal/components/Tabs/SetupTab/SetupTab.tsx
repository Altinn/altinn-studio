import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { ErrorMessage } from '@digdir/design-system-react';
import { TabHeader } from '../../TabHeader';
import { SetupTabContent } from './SetupTabContent';
import { TabContent } from '../../TabContent';

export type SetupTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the setup tab for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const SetupTab = ({ org, app }: SetupTabProps): ReactNode => {
  const { t } = useTranslation();

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'pending':
        return <LoadingTabData />;
      case 'error':
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      case 'success':
        return <SetupTabContent appMetadata={appMetadata} org={org} app={app} />;
    }
  };

  return (
    <TabContent>
      <TabHeader text={t('settings_modal.setup_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};
