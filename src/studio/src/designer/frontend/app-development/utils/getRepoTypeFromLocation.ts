function getRepoTypeFromLocation(): string | undefined {
  if (!window) {
    return undefined;
  }
  return window.location.pathname.endsWith('-datamodels') ? 'datamodels' : undefined;
}
export default getRepoTypeFromLocation;
