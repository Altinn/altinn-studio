const {
  location, org, app,
} = window as Window as IAltinnWindow;
const { origin } = location;
const cdn = 'https://altinncdn.no';
const desingerApi = `${origin}/designer/api`;
const dataModelsApi = `${desingerApi}/${org}/${app}/dataModels`;

export const repoStatusUrl = `${origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${app}`;
export const languageUrl = `${origin}/designerapi/Language/GetLanguageAsJSON`;
export const giteaSignOutUrl = `${origin}/repos/user/logout`;
export const studioSignOutUrl = `${origin}/Home/Logout`;
export const appDeploymentsUrl = `${desingerApi}/v1/${org}/${app}/Deployments`;
export const keepAliveUrl = `${desingerApi}/v1/session/keepalive`;
export const fetchDeployPermissionsUrl = `${desingerApi}/v1/${org}/${app}/deployments/permissions`;
export const remainingSessionTimeUrl = `${desingerApi}/v1/session/remaining`;
export const releasesPostUrl = `${desingerApi}/v1/${org}/${app}/releases`;
export const releasesGetUrl = `${releasesPostUrl}?sortBy=created&sortDirection=Descending`;
export const orgsListUrl = `${cdn}/orgs/altinn-orgs.json`;
export const environmentsConfigUrl = `${cdn}/config/environments.json`;
export const applicationMetadataUrl = `${origin}/designer/api/v1/${org}/${app}`;

export const getReleaseBuildPipelineLink =
  (buildId: string) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getGitCommitLink =
  (commitId: string) => `${origin}/repos/${org}/${app}/commit/${commitId}`;

export const getAzureDevopsBuildResultUrl =
  (buildId: string | number) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getFetchDataModelUrl =
  (modelName: string) => `${dataModelsApi}/GetDatamodel?modelName=${encodeURIComponent(modelName)}`;

export const getSaveDataModelUrl =
  (modelName: string) => `${dataModelsApi}/UpdateDatamodel?modelName=${encodeURIComponent(modelName)}`;

export const getDeleteDataModelUrl =
  (modelName: string) => `${dataModelsApi}/DeleteDatamodel?modelName=${encodeURIComponent(modelName)}`;
