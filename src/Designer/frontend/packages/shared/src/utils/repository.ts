import { RepositoryType } from '../types/global';
import {
  APP_DEVELOPMENT_BASENAME,
  DASHBOARD_BASENAME,
  ORG_LIBRARY_BASENAME,
  RESOURCEADM_BASENAME,
} from 'app-shared/constants';

export function getRepositoryType(org: string, repoName: string): RepositoryType {
  switch (repoName) {
    case `${org}-datamodels`:
      return RepositoryType.DataModels;
    case `${org}-resources`:
      return RepositoryType.Resources;
    case `${org}-content`:
      return RepositoryType.OrgLibrary;
    default:
      return RepositoryType.App;
  }
}

export function getRepositoryEditUrl(org: string, repoName: string): string {
  switch (getRepositoryType(org, repoName)) {
    case RepositoryType.DataModels:
      return `${APP_DEVELOPMENT_BASENAME}/${org}/${repoName}/data-model`;
    case RepositoryType.Resources:
      return `${RESOURCEADM_BASENAME}/${org}/${repoName}`;
    case RepositoryType.OrgLibrary:
      return `${DASHBOARD_BASENAME}/${ORG_LIBRARY_BASENAME}/${org}`;
    default:
      return `${APP_DEVELOPMENT_BASENAME}/${org}/${repoName}`;
  }
}
