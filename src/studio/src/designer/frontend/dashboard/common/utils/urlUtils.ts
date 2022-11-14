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
  isDatamodelling?: boolean;
}

export const getRepoEditUrl = ({ repoFullName, isDatamodelling }: IGetRepoUrl) => {
  if (isDatamodelling) {
    return `${APP_DEVELOPMENT_BASENAME}/${repoFullName}#/datamodel`;
  }

  return `${APP_DEVELOPMENT_BASENAME}/${repoFullName}`;
};
