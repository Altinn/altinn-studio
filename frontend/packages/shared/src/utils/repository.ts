import { RepositoryType } from '../types/global';

export function getRepositoryType(org: string, repoName: string): RepositoryType {
  if (repoName === `${org}-datamodels`) {
    return RepositoryType.Datamodels;
  }

  return RepositoryType.App;
}
