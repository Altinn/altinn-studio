import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const { org, app } = _useParamsClassCompHack();
const basePath = `${window.location.origin}/designer/api/${org}/${app}`;

// Aure paths
export const getReleaseBuildPipelineLink = (buildId: string) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
export const getAzureDevopsBuildResultUrl = (buildId: string | number) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

// Deployments
export const appDeploymentsUrl = `${basePath}/deployments`; // Get, Post
export const fetchDeployPermissionsUrl = `${basePath}/deployments/permissions`; // Get

// Releases
export const releasesPostUrl = `${basePath}/releases`; // Get, Post
export const releasesGetUrl = `${basePath}/releases?sortDirection=Descending`; // Get
