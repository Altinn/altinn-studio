type GetRepoUrl = {
  repoFullName: string;
};

export const getRepoEditUrl = ({ repoFullName }: GetRepoUrl) => {
  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `/designer/${repoFullName}`;
};
