type GetRepoUrl = {
  repoIsClonedLocally: boolean;
  repoFullName: string;
};

export const getRepoUrl = ({
  repoIsClonedLocally,
  repoFullName,
}: GetRepoUrl) => {
  if (!repoIsClonedLocally) {
    return `/Home/Index#/clone-app/${repoFullName}`;
  }

  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `/designer/${repoFullName}`;
};
