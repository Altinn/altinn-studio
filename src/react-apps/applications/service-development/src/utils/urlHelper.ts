/* tslint:disable: max-line-length */
const { org, app } = window as Window as IAltinnWindow;
const origin = window.location.origin;

export const getRepoStatusUrl = (): string => {
  return `${origin}/designerapi/Repository/RepoStatus?org=${org}&repository=${app}`;
};

export const getAzureDevopsBuildResultUrl = (buildId: string|number): string => {
  return `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
};

export const getEnvironmentsConfigUrl = (): string => {
  return 'https://altinncdn.no/config/environments.json';
};

export const getAppDeploymentsUrl = () => {
  return `${origin}/designer/api/v1/${org}/${app}/Deployments`;
};
