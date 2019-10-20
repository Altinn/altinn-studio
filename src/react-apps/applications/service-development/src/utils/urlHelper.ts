/* tslint:disable: max-line-length */
const { org, app } = window as Window as IAltinnWindow;
const origin = window.location.origin;

export const getRepoStatusUrl = (): string => {
  return `${origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${app}`;
};

export const releasesUrl: string = `${origin}/designer/api/v1/${org}/${app}/releases`;
export const languageUrl: string = `${origin}/designerapi/Language/GetLanguageAsJSON`;

export const getReleaseBuildPipelineLink = (buildId: string) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getGitCommitLink = (commitId: string) =>
  `${origin}/repos/${org}/${app}/commit/${commitId}`;
