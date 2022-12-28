import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const { org, app } = _useParamsClassCompHack();
const desingerApi = `${window.location.origin}/designer/api`;

export const appDeploymentsUrl = `${desingerApi}/v1/${org}/${app}/Deployments`;
export const fetchDeployPermissionsUrl = `${desingerApi}/v1/${org}/${app}/deployments/permissions`;
export const releasesPostUrl = `${desingerApi}/v1/${org}/${app}/releases`;
export const releasesGetUrl = `${releasesPostUrl}?sortDirection=Descending`;
export const applicationMetadataUrl = `${window.location.origin}/designer/api/v1/${org}/${app}`;

export const getReleaseBuildPipelineLink = (buildId: string) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

export const getAzureDevopsBuildResultUrl = (buildId: string | number) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
