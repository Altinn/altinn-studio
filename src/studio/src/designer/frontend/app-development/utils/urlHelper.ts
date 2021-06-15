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

export const getFetchDataModelUrl = (modelName: string) => {
  return `${origin}/designer/api/${org}/${app}/datamodels/GetDatamodel?modelName=${encodeURIComponent(modelName)}`;
};

export const getStaticDataModelUrl = (modelName: string) => {
  return `${origin}/repos/${org}/${app}/models/${encodeURIComponent(modelName)}.schema.json`;
};

export const getSaveDataModelUrl = (modelName: string) => {
  return `${origin}/designer/api/${org}/${app}/datamodels/UpdateDatamodel?modelName=${encodeURIComponent(modelName)}`;
};

export const getDeleteDataModelUrl = (modelName: string) => {
  return `${origin}/designer/api/${org}/${app}/datamodels/DeleteDatamodel?modelName=${encodeURIComponent(modelName)}`;
};

export const getFetchDeployPermissionsUrl = () => {
  return `${origin}/designer/api/v1/${org}/${app}/deployments/permissions`;
};

export const getRemainingSessionTimeUrl = () => {
  return `${origin}/designer/api/v1/session/remaining`;
};

export const getKeepAliveUrl = () => {
  return `${origin}/designer/api/v1/session/keepalive`;
};

export const getGiteaSignOutUrl = () => {
  return `${origin}/repos/user/logout`;
};

export const getStudioSignOutUrl = () => {
  return `${origin}/Home/Logout`;
};
