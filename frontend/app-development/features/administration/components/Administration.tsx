import React from 'react';
import { AltinnColumnLayout } from 'app-shared/components/AltinnColumnLayout';
import { PageSpinner } from 'app-shared/components';
import { DatamodelsAdministration } from './DatamodelsAdministration';
import { RepositoryType } from 'app-shared/types/global';
import { ServiceAdministration } from './ServiceAdministration';
import { SideMenuContent } from './SideMenuContent';
import { getRepositoryType } from 'app-shared/utils/repository';
import { useAppSelector } from '../../../hooks';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function AdministrationComponent() {
  const repository = useAppSelector((state) => state.serviceInformation.repositoryInfo);
  const initialCommit = useAppSelector((state) => state.serviceInformation.initialCommit);
  const { t } = useTranslation();
  const { org, app } = useParams();
  const repositoryType = getRepositoryType(org, app);

  return (
    <div data-testid='administration-container'>
      {repository && (
        <AltinnColumnLayout
          sideMenuChildren={
            <SideMenuContent
              initialCommit={initialCommit}
              service={repository}
              repoType={repositoryType}
            />
          }
          header={t('administration.administration')}
        >
          {repositoryType === RepositoryType.App && (
            <ServiceAdministration repository={repository} />
          )}
          {repositoryType === RepositoryType.Datamodels && (
            <DatamodelsAdministration />
          )}
        </AltinnColumnLayout>
      )}
      {!repository && (
        <PageSpinner />
      )}
    </div>
  );
}

export const Administration = AdministrationComponent;
