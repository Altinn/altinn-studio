import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const { org, app } = _useParamsClassCompHack();
const basePath = `${window.location.origin}/designer/api/${org}/${app}`;

// Deployments
export const deploymentsPath = `${basePath}/deployments`; // Get
export const deployPermissionsPath = `${basePath}/deployments/permissions`; // Get
export const createDeploymentPath = `${basePath}/deployments/create-deployment`; // Post

// Releases
export const releasesPath = `${basePath}/releases`; // Get, Post
export const releasesSortedDescPath = `${basePath}/releases?sortDirection=Descending`; // Get

// Aure paths
export const getReleaseBuildPipelineLink = (buildId: string) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
export const getAzureDevopsBuildResultUrl = (buildId: string | number) => `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;

// Deprecated
export const appDeploymentsUrl = `${basePath}/deployments`; // Get
export const fetchDeployPermissionsUrl = `${basePath}/deployments/permissions`; // Get

export const releasesPostUrl = `${basePath}/releases`; // Get, Post
export const releasesGetUrl = `${basePath}/releases?sortDirection=Descending`; // Get
