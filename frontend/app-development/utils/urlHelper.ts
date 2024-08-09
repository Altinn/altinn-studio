// Azure paths
export const getReleaseBuildPipelineLink = (buildId: string) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
export const getAzureDevopsBuildResultUrl = (buildId: string | number) =>
  `https://dev.azure.com/brreg/altinn-studio/_build/results?buildId=${buildId}`;
