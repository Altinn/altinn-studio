type GetRepoUrl = {
  repoFullName: string;
};

export const getRepoUrl = ({ repoFullName }: GetRepoUrl) => {
  if (repoFullName.endsWith('-datamodels')) {
    return `#/datamodelling/${repoFullName}`;
  }

  return `/designer/${repoFullName}`;
};
