/* tslint:disable: max-line-length */
const altinnWindow = window as any;
const { org, service } = altinnWindow;
const origin = window.location.origin;

export const getRepoStatusUrl = (): string => {
  return `${origin}/designerapi/Repository/RepoStatus?owner=${org}&repository=${service}`;
};
