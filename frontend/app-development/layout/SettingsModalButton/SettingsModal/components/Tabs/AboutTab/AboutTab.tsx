import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import type { AppConfig } from 'app-shared/types/AppConfig';
import { ErrorMessage } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useRepoInitialCommitQuery, useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { InputFields } from './InputFields';
import { CreatedFor } from './CreatedFor';
import { TabContent } from '../../TabContent';

export type AboutTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the config for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AboutTab = ({ org, app }: AboutTabProps): ReactNode => {
  const { t } = useTranslation();

  const repositoryType = getRepositoryType(org, app);

  const {
    status: appConfigStatus,
    data: appConfigData,
    error: appConfigError,
  } = useAppConfigQuery(org, app);
  const {
    status: repositoryStatus,
    data: repositoryData,
    error: repositoryError,
  } = useRepoMetadataQuery(org, app);
  const {
    status: initialCommitStatus,
    data: initialCommitData,
    error: initialCommitError,
  } = useRepoInitialCommitQuery(org, app);

  const { mutate: updateAppConfigMutation } = useAppConfigMutation(org, app);

  const handleSaveAppConfig = (appConfig: AppConfig) => {
    updateAppConfigMutation(appConfig);
  };

  const displayContent = () => {
    switch (mergeQueryStatuses(appConfigStatus, repositoryStatus, initialCommitStatus)) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appConfigError && <ErrorMessage>{appConfigError.message}</ErrorMessage>}
            {repositoryError && <ErrorMessage>{repositoryError.message}</ErrorMessage>}
            {initialCommitError && <ErrorMessage>{initialCommitError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        return (
          <>
            <InputFields appConfig={appConfigData} onSave={handleSaveAppConfig} />
            <Divider marginless />
            <CreatedFor
              repositoryType={repositoryType}
              repository={repositoryData}
              authorName={initialCommitData.author.name}
            />
          </>
        );
      }
    }
  };
  return (
    <TabContent>
      <TabHeader text={t('settings_modal.about_tab_heading')} />
      {displayContent()}
    </TabContent>
  );
};
