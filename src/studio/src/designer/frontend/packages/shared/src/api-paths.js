import { stringify as s } from 'query-string';

export const abortmergePath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/abortmerge`;
export const createDatamodelPath = (owner, repo) => `/designer/api/${owner}/${repo}/datamodels/post`;
export const datamodelAddXsdFromRepoPath = (owner, repo, modelPath) => `/designer/api/${owner}/${repo}/datamodels/xsd-from-repo?filePath=${modelPath}`;
export const datamodelGetPath = (owner, repo, modelPath) => `/designer/api/${owner}/${repo}/datamodels${modelPath}`;
export const datamodelPath = (owner, repo, modelPath) => `/designer/api/${owner}/${repo}/datamodels?${s({ modelPath })}`;
export const datamodelXsdPath = (owner, repo) => `/designer/${owner}/${repo}/Model/GetXsd`;
export const datamodelsPath = (owner, repo) => `/designer/api/${owner}/${repo}/datamodels`;
export const datamodelsXsdPath = (owner, repo) => `/designer/api/${owner}/${repo}/datamodels/xsd`;
export const datamodelsUploadPath = (owner, repo) => `/designer/api/${owner}/${repo}/datamodels/upload`;
export const discardChangesPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/discard`;
export const frontendLangPath = (locale) => `/designer/frontend/lang/${locale}.json`;
export const gitCommitPath = (owner, repo, commitId) => `/repos/${owner}/${repo}/commit/${commitId}`;
export const keepAlivePath = () => `/designer/api/v1/session/keepalive`;
export const masterRepoStatusPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/branches/branch?branch=master`;
export const orgsListPath = () => '/designer/api/v1/orgs';
export const remainingSessionTimePath = () => `/designer/api/v1/session/remaining`;
export const repoCommitPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/commit`;
export const repoDownloadPath = (owner, repo, full) => `/designer/api/v1/repos/${owner}/${repo}/contents.zip?${s({ full })}`;
export const repoInitialCommitPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/initialcommit`;
export const repoMetaPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}`;
export const repoPullPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/pull`;
export const repoPushPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/push`;
export const repoResetPAth = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/reset`;
export const repoSearchPath = () => '/designer/api/v1/repos/search';
export const repoStatusPath = (owner, repo) => `/designer/api/v1/repos/${owner}/${repo}/status`;
export const reposListPath = (owner) => `/designer/api/v1/repos/${owner}`;
export const repositoryGitPath = (owner, repo) => `/repos/${owner}/${repo}.git`;
export const serviceConfigPath = (owner, repo) => `/designer/${owner}/${repo}/Config/GetServiceConfig`;
export const serviceNamePath = (owner, repo) => `/designer/${owner}/${repo}/Text/GetServiceName`;
export const setServiceConfigPath = (owner, repo) => `/designer/${owner}/${repo}/Config/SetServiceConfig`;
export const setServiceNamePath = (owner, repo) => `/designer/${owner}/${repo}/Text/SetServiceName`;
export const textResourcesPath = (owner, repo, langcode) => `/designer/${owner}/${repo}/UIEditor/GetTextResources/${langcode}`;
export const userCurrentPath = () => '/designer/api/v1/user/current';
export const userLogoutAfterPath = () => '/Home/Logout';
export const userLogoutPath = () => '/repos/user/logout';
export const userReposPath = () => '/designer/api/v1/user/repos';
export const userStarredListPath = () => '/designer/api/v1/user/starred';
export const userStarredRepoPath = (owner, repo) => `/designer/api/v1/user/starred/${owner}/${repo}`;
export const repositoryPath = (owner, repo) => `/repos/${owner}/${repo}`;
export const repositoryOwnerPath = (owner) => `/repos/${owner}`;
export const repositoryBasePath = () => '/repos';

export const copyAppPath = (org, sourceRepository, targetRepository) =>
  `/designer/api/v1/repos/copyapp?${s({
    org,
    sourceRepository,
    targetRepository,
  })}`;

export const getServiceFilesPath = (owner, repo, fileEditorMode) =>
  `/designer/${owner}/${repo}/ServiceDevelopment/GetServiceFiles?${s({
    fileEditorMode,
  })}`;

export const getServiceFilePath = (owner, repo, fileEditorMode, fileName) =>
  `/designer/${owner}/${repo}/ServiceDevelopment/GetServiceFile?${s({
    fileEditorMode,
    fileName,
  })}`;

export const saveServiceFilePath = (
  owner,
  repo,
  fileEditorMode,
  fileName,
  stageFile,
) =>
  `/designer/${owner}/${repo}/ServiceDevelopment/SaveServiceFile?${s({
    fileEditorMode,
    fileName,
    stageFile,
  })}`;
