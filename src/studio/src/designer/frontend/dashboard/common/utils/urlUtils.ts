interface IApplicationAboutPage {
  repoFullName: string;
}

export const applicationAboutPage = ({
  repoFullName,
}: IApplicationAboutPage) => {
  return `${window.location.origin}/designer/${repoFullName}#/`;
};

interface IGetRepoUrl {
  repoFullName: string;
  isDatamodelling?: boolean;
}

export const getRepoEditUrl = ({ repoFullName, isDatamodelling }: IGetRepoUrl) => {
  if (isDatamodelling) {
    return `/designer/${repoFullName}#/datamodel`;
  }
  return `/designer/${repoFullName}`;
};
