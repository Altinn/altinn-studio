import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

interface IApplicationAboutPage {
  repoFullName: string;
}

export const applicationAboutPage = ({
  repoFullName,
}: IApplicationAboutPage) => {
  return `${window.location.origin}${APP_DEVELOPMENT_BASENAME}/${repoFullName}#/`;
};

interface IGetRepoUrl {
  repoFullName: string;
}

export const getRepoEditUrl = ({ repoFullName }: IGetRepoUrl) => {
  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `${APP_DEVELOPMENT_BASENAME}/${repoFullName}`;
};
