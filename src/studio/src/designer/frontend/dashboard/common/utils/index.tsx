export const appNameRegex = /^(?!datamodels$)[a-z]+[a-z0-9-]+[a-z0-9]$/;

export const validateRepoName = (repoName: string) => {
  return appNameRegex.test(repoName);
};
