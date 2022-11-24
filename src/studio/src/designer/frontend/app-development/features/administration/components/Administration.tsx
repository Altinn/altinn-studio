import React from 'react';
import { useParams } from 'react-router-dom';

import { AltinnColumnLayout } from 'app-shared/components/AltinnColumnLayout';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { SideMenuContent } from './SideMenuContent';
import { useAppSelector } from '../../../common/hooks';
import { ServiceAdministration } from './ServiceAdministration';
import { DatamodelsAdministration } from './DatamodelsAdministration';
import { getRepositoryType } from 'app-shared/utils/repository';

import { RepositoryType } from 'app-shared/types/global';
import classes from './Administration.module.css';

export function AdministrationComponent() {
  const language = useAppSelector((state) => state.languageState.language);
  const repository = useAppSelector(
    (state) => state.serviceInformation.repositoryInfo,
  );
  const initialCommit = useAppSelector(
    (state) => state.serviceInformation.initialCommit,
  );
  const { org, app } = useParams();
  const repositoryType = getRepositoryType(org, app);

  return (
    <div data-testid='administration-container'>
      {repository && (
        <AltinnColumnLayout
          sideMenuChildren={
            <SideMenuContent
              initialCommit={initialCommit}
              language={language}
              service={repository}
              repoType={repositoryType}
            />
          }
          header={getLanguageFromKey('administration.administration', language)}
        >
          {repositoryType === RepositoryType.App && (
            <ServiceAdministration
              language={language}
              repository={repository}
            />
          )}
          {repositoryType === RepositoryType.Datamodels && (
            <DatamodelsAdministration language={language} />
          )}
        </AltinnColumnLayout>
      )}
      {!repository && (
        <div>
          <AltinnSpinner
            spinnerText='Laster siden'
            styleObj={classes.spinnerLocation}
          />
        </div>
      )}
    </div>
  );
}

export const Administration = AdministrationComponent;
