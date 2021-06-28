const {
  location, org, app,
} = window as Window as IAltinnWindow;
const { origin } = location;
const cdn = 'https://altinncdn.no';
const desingerApi = `${origin}/designer/api`;
const repo = app;

export const datamodelsApi = `${desingerApi}/${org}/${repo}/datamodels`;
export const repoStatusUrl = `${origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${repo}`;
export const languageUrl = `${origin}/designerapi/Language/GetLanguageAsJSON`;
export const giteaSignOutUrl = `${origin}/repos/user/logout`;
export const studioSignOutUrl = `${origin}/Home/Logout`;
export const releasesPostUrl = `${desingerApi}/v1/${org}/${repo}/releases`;
export const appDeploymentsUrl = `${desingerApi}/v1/${org}/${repo}/Deployments`;
export const keepAliveUrl = `${desingerApi}/v1/session/keepalive`;
export const fetchDeployPermissionsUrl = `${desingerApi}/v1/${org}/${repo}/deployments/permissions`;
export const remainingSessionTimeUrl = `${desingerApi}/v1/session/remaining`;
export const releasesGetUrl = `${releasesPostUrl}?sortBy=created&sortDirection=Descending`;
export const orgsListUrl = `${cdn}/orgs/altinn-orgs.json`;
export const environmentsConfigUrl = `${cdn}/config/environments.json`;

export const getReleaseBuildPipelineLink =
  (buildId: string) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getGitCommitLink =
  (commitId: string) => `${origin}/repos/${org}/${repo}/commit/${commitId}`;

export const getAzureDevopsBuildResultUrl =
  (buildId: string | number) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getFetchDataModelUrl =
  (modelName: string) => `${datamodelsApi}/GetDatamodel?modelName=${encodeURIComponent(modelName)}`;

export const getSaveDataModelUrl =
  (modelName: string) => `${datamodelsApi}/UpdateDatamodel?modelName=${encodeURIComponent(modelName)}`;

export const getDeleteDataModelUrl =
  (modelName: string) => `${datamodelsApi}/DeleteDatamodel?modelName=${encodeURIComponent(modelName)}`;

export const createDatamodellingUrl =
  (pathToModelFile: string) => `${datamodelsApi}?modelPath=${encodeURIComponent(pathToModelFile)}`;
