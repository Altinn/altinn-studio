import React from 'react';
import { Grid } from '@mui/material';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { SideMenuContent } from '../SideMenuContent';
import { useAppSelector } from 'common/hooks';
import classes from './Administration.module.css';
import {
  RepositoryType,
  useGetRepositoryTypeQuery,
} from 'services/repositoryApi';
import { ServiceAdministration } from './ServiceAdministration';
import { DatamodelsAdministration } from './DatamodelsAdministration';

export function AdministrationComponent() {
  const language = useAppSelector((state) => state.languageState.language);
  const repository = useAppSelector(
    (state) => state.serviceInformation.repositoryInfo,
  );
  const initialCommit = useAppSelector(
    (state) => state.serviceInformation.initialCommit,
  );
  const { data: repositoryType, isLoading: isLoadingRepoType } =
    useGetRepositoryTypeQuery();

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
          {!isLoadingRepoType && repositoryType === RepositoryType.App && (
            <ServiceAdministration
              language={language}
              repository={repository}
            />
          )}
          {!isLoadingRepoType &&
            repositoryType === RepositoryType.Datamodels && (
              <DatamodelsAdministration language={language} />
            )}
        </AltinnColumnLayout>
      )}
      {isLoadingRepoType && (
        <Grid container={true}>
          <AltinnSpinner
            spinnerText='Laster siden'
            styleObj={classes.spinnerLocation}
          />
        </Grid>
      )}
    </div>
  );
}

export const Administration = AdministrationComponent;
