interface ApplicationAboutPage {
  repoFullName: string;
}

export const applicationAboutPage = ({
  repoFullName,
}: ApplicationAboutPage) => {
  return `${window.location.origin}/designer/${repoFullName}#/about`;
};

interface GetRepoUrl {
  repoFullName: string;
}

export const getRepoEditUrl = ({ repoFullName }: GetRepoUrl) => {
  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `/designer/${repoFullName}`;
};
