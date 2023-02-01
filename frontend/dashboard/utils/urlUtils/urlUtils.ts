import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { RepositoryType } from 'app-shared/types/global';
import { getRepositoryType } from 'app-shared/utils/repository';

export const applicationAboutPage = ({ org, repo }: IGetRepoUrl) => {
  return `${window.location.origin}${APP_DEVELOPMENT_BASENAME}/${org}/${repo}/`;
};

interface IGetRepoUrl {
  org: string;
  repo: string;
}

export const getRepoEditUrl = ({ org, repo }: IGetRepoUrl) => {
  if (getRepositoryType(org, repo) === RepositoryType.Datamodels) {
    return `${APP_DEVELOPMENT_BASENAME}/${org}/${repo}/datamodel`;
  }

  return `${APP_DEVELOPMENT_BASENAME}/${org}/${repo}`;
};
