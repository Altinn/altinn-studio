interface IApplicationAboutPage {
  repoFullName: string;
}

export const applicationAboutPage = ({
  repoFullName,
}: IApplicationAboutPage) => {
  return `${window.location.origin}/designer/${repoFullName}#/about`;
};

interface IGetRepoUrl {
  repoFullName: string;
}

export const getRepoEditUrl = ({ repoFullName }: IGetRepoUrl) => {
  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `/designer/${repoFullName}`;
};
