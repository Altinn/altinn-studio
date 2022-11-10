import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const { org, app } = _useParamsClassCompHack();
const cdn = 'https://altinncdn.no';
const desingerApi = `${window.location.origin}/designer/api`;

export const repoStatusUrl = `${window.location.origin}/designer/api/v1/repos/${org}/${app}/status`;
export const languageUrl = `${window.location.origin}/designer/frontend/lang`;
export const giteaSignOutUrl = `${window.location.origin}/repos/user/logout`;
export const studioSignOutUrl = `${window.location.origin}/Home/Logout`;
export const appDeploymentsUrl = `${desingerApi}/v1/${org}/${app}/Deployments`;
export const keepAliveUrl = `${desingerApi}/v1/session/keepalive`;
export const fetchDeployPermissionsUrl = `${desingerApi}/v1/${org}/${app}/deployments/permissions`;
export const remainingSessionTimeUrl = `${desingerApi}/v1/session/remaining`;
export const releasesPostUrl = `${desingerApi}/v1/${org}/${app}/releases`;
export const releasesGetUrl = `${releasesPostUrl}?sortDirection=Descending`;
export const orgsListUrl = `${cdn}/orgs/altinn-orgs.json`;
export const environmentsConfigUrl = `${cdn}/config/environments.json`;
export const applicationMetadataUrl = `${window.location.origin}/designer/api/v1/${org}/${app}`;

export const getReleaseBuildPipelineLink = (buildId: string) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getGitCommitLink = (commitId: string) =>
  `${origin}/repos/${org}/${app}/commit/${commitId}`;

export const getAzureDevopsBuildResultUrl = (buildId: string | number) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
