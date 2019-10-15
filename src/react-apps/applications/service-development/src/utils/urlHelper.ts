/* tslint:disable: max-line-length */
const { org, app } = window as IAltinnWindow;
const origin = window.location.origin;

export const getRepoStatusUrl = (): string => {
  return `${origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${app}`;
};
