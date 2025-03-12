import { RepositoryType } from '../types/global';
import { DATA_MODEL_REPO_IDENTIFIER } from 'app-shared/constants';

export function getRepositoryType(org: string, repoName: string): RepositoryType {
  if (repoName === `${org}-datamodels`) {
    return RepositoryType.DataModels;
  }

  return RepositoryType.App;
}

export function isDataModelRepo(repoName: string): boolean {
  return repoName.endsWith(DATA_MODEL_REPO_IDENTIFIER);
}
