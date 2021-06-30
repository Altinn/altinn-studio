function getRepoTypeFromName(repoName: string) {
  return repoName.endsWith('-datamodels') ? 'datamodels' : undefined;
}
export default getRepoTypeFromName;
