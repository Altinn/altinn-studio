/* tslint:disable: max-line-length */
const { org, app } = window as Window as IAltinnWindow;
const origin = window.location.origin;

export const getRepoStatusUrl = (): string => {
  return `${origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${app}`;
};

export const releasesUrlPost: string = `${origin}/designer/api/v1/${org}/${app}/releases`;
export const releasesUrlGet: string = `${releasesUrlPost}?sortBy=created&sortDirection=Descending`;
export const languageUrl: string = `${origin}/designerapi/Language/GetLanguageAsJSON`;
export const getOrgsListUrl: string = 'https://altinncdn.no/orgs/altinn-orgs.json';

export const getReleaseBuildPipelineLink = (buildId: string) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getGitCommitLink = (commitId: string) => `${origin}/repos/${org}/${app}/commit/${commitId}`;

export const getAzureDevopsBuildResultUrl = (buildId: string|number): string => {
  return `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
};

export const getEnvironmentsConfigUrl = (): string => {
  return 'https://altinncdn.no/config/environments.json';
};

export const getAppDeploymentsUrl = () => {
  return `${origin}/designer/api/v1/${org}/${app}/Deployments`;
};

export const getFetchDataModelUrl = (filePath: string) => {
  return `${origin}/designer/api/${org}/${app}/datamodels/GetDatamodel?filePath=${encodeURIComponent(filePath)}`;
};

export const getSaveDataModelUrl = (filePath: string) => {
  return `${origin}/designer/api/${org}/${app}/datamodels/UpdateDatamodel?filePath=${encodeURIComponent(filePath)}`;
};
