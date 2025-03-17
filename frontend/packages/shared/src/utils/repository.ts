import { RepositoryType } from '../types/global';
import { DATA_MODEL_REPO_IDENTIFIER } from 'app-shared/constants';

export function getRepositoryType(org: string, repoName: string): RepositoryType {
  if (repoName === `${org}${DATA_MODEL_REPO_IDENTIFIER}`) {
    return RepositoryType.DataModels;
  }

  return RepositoryType.App;
}
