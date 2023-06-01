import { stringify as s } from 'qs';
import { APP_DEVELOPMENT_BASENAME } from '../constants';

// ApplicationMetaData
export const appMetadataPath = (org, app) => `/designer/api/${org}/${app}/metadata`; // Get, Put, Post
export const appMetadataAttachmentPath = (org, app) => `/designer/api/${org}/${app}/metadata/attachment-component`; // Post, Put, Delete

// Config
export const serviceConfigPath = (org, app) => `/designer/api/${org}/${app}/config`; // Get, Post

// Datamodel
export const createDatamodelPath = (org, app) => `/designer/api/${org}/${app}/datamodels/new`; // Post
export const datamodelPath = (org, app, modelPath) => `/designer/api/${org}/${app}/datamodels/datamodel?${s({ modelPath })}`; // Get, Put, Delete
export const datamodelsPath = (org, app) => `/designer/api/${org}/${app}/datamodels/all-json`; // Get
export const datamodelsXsdPath = (org, app) => `/designer/api/${org}/${app}/datamodels/all-xsd`; // Get
export const datamodelsUploadPath = (org, app) => `/designer/api/${org}/${app}/datamodels/upload`; // Post
export const datamodelAddXsdFromRepoPath = (org, app, filePath) => `/designer/api/${org}/${app}/datamodels/xsd-from-repo?${s({ filePath })}`; // Post
export const datamodelUploadPagePath = (org, app) => `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/datamodel`;

// Deployment
// See frontend/app-development/utils/urlHelper.ts Deployments

// FormEditor
export const ruleHandlerPath = (org, app, layoutSetName) => `/designer/api/${org}/${app}/app-development/rule-handler?${s({ layoutSetName })}`; // Get
export const saveRuleHandlerPath = (org, app, stageFile) => `/designer/api/${org}/${app}/app-development/rule-handler?${stageFile}`; // Post
export const widgetSettingsPath = (org, app) => `/designer/api/${org}/${app}/app-development/widget-settings`; // Get
export const ruleConfigPath = (org, app, layoutSetName) => `/designer/api/${org}/${app}/app-development/rule-config?${s({ layoutSetName })}`; // Get, Post
export const layoutSetsPath = (org, app, layoutSetName) => `/designer/api/${org}/${app}/app-development/layout-sets?${s({ layoutSetName })}`; // Get, Put, Post
export const layoutSettingsPath = (org, app, layoutSetName) => `/designer/api/${org}/${app}/app-development/layout-settings?${s({ layoutSetName })}`; // Get, Post
export const formLayoutsPath = (org, app, layoutSetName) => `/designer/api/${org}/${app}/app-development/form-layouts?${s({ layoutSetName })}`; // Get
export const formLayoutPath = (org, app, layout, layoutSetName) => `/designer/api/${org}/${app}/app-development/form-layout/${layout}?${s({ layoutSetName })}`; // Post, Delete
export const formLayoutNamePath = (org, app, layoutName, layoutSetName) => `/designer/api/${org}/${app}/app-development/form-layout-name/${layoutName}?${s({ layoutSetName })}`; // Put

// Frontend-language
export const frontendLangPath = (locale) => `/designer/frontend/lang/${locale}.json`;

// Gitea
export const gitCommitPath = (org, app, commitId) => `/repos/${org}/${app}/commit/${commitId}`;
export const repositoryGitPath = (org, app) => `/repos/${org}/${app}.git`;
export const repositoryPath = (org, app) => `/repos/${org}/${app}`;
export const publiserPath = (org, app) => `/editor/${org}/${app}/deploy`;
export const repositoryOwnerPath = (org) => `/repos/${org}`;
export const repositoryBasePath = () => '/repos';
export const userLogoutPath = () => '/repos/user/logout';

// Home
export const userLogoutAfterPath = () => '/Home/Logout';

// Languages - new text-format
export const languagesPath = (org, app) => `/designer/api/${org}/${app}/languages`; // Get

// Model
export const datamodelMetadataPath = (org, app) => `/designer/api/${org}/${app}/model/metadata`; // Get

// Organizations
export const orgsListPath = () => '/designer/api/orgs'; // Get

// Preview
export const previewPath = (org, app) => `/preview/${org}/${app}`;
export const instanceIdForPreviewPath = (org, app) => `/designer/api/${org}/${app}/mock-instance-id`; // Get

// Preview - SignalR Hub
export const previewSignalRHubSubPath = () => '/previewHub';

// Release and Deployment
// See frontend/app-development/utils/urlHelper.ts Releases
export const releasesPath = (org, app, sortDirection) => `/designer/api/${org}/${app}/releases?${s({ sortDirection })}`;
export const deploymentsPath = (org, app, sortDirection) => `/designer/api/${org}/${app}/deployments?${s({ sortDirection })}`;
export const deployPermissionsPath = (org, app) => `/designer/api/${org}/${app}/deployments/permissions`;
export const envConfigPath = () => `/designer/api/environments`;

// Repositories
export const abortmergePath = (org, app) => `/designer/api/repos/repo/${org}/${app}/abort-merge`;
export const branchStatusPath = (org, app, branch) => `/designer/api/repos/repo/${org}/${app}/branches/branch?${s({ branch })}`; // Get
export const cloneAppPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/clone`; // Get
export const copyAppPath = (org, sourceRepository, targetRepository) => `/designer/api/repos/repo/${org}/copy-app?${s({ sourceRepository, targetRepository })}`;
export const createRepoPath = () => `/designer/api/repos/create-app`; // Post
export const discardChangesPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/discard`; // Get
export const discardFileChangesPath = (org, app, filename) => `/designer/api/repos/repo/${org}/${app}/discard/${filename}`; // Get
export const masterRepoStatusPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/branches/branch?branch=master`; // Get
export const repoBranchesPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/branches`; // Get
export const repoCommitPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/commit`; // Post
export const repoCommitPushPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/commit-and-push`; // Post
export const repoDownloadPath = (org, app, full) => `/designer/api/repos/repo/${org}/${app}/contents.zip?${s({ full })}`;
export const repoInitialCommitPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/initial-commit`; // Get
export const repoLatestCommitPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/latest-commit`; // Get
export const repoLogPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/log`; // Get
export const repoMetaPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/metadata`; // Get
export const repoPullPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/pull`; // Get
export const repoPushPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/push`; // Post
export const repoResetPAth = (org, app) => `/designer/api/repos/repo/${org}/${app}/reset`; // Get
export const repoSearchPath = () => '/designer/api/repos/search'; // Get
export const repoStatusPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/status`; // Get
export const reposListPath = (org) => `/designer/api/repos/org/${org}`; // Get
export const stageFilePath = (org, app, filename) => `/designer/api/repos/repo/${org}/${app}/stage/${filename}`; // Get

// Session
export const keepAlivePath = () => `/designer/api/session/keepalive`; // Get
export const remainingSessionTimePath = () => `/designer/api/session/remaining`; // Get

// Text - old
export const textLanguagesPath = (org, app) => `/designer/api/${org}/${app}/text/languages`; // Get
export const textResourcesPath = (org, app, langCode) => `/designer/api/${org}/${app}/text/language/${langCode}`; // Get, Post, Put, Delete
export const serviceNamePath = (org, app) => `/designer/api/${org}/${app}/text/service-name`; // Get
export const textResourceIdsPath = (org, app) => `/designer/api/${org}/${app}/text/keys`; // Put

// Text - new

// User
export const userCurrentPath = () => '/designer/api/user/current'; // Get
export const userReposPath = () => '/designer/api/user/repos'; // Get
export const userStarredListPath = () => '/designer/api/user/starred'; // Get
export const userStarredRepoPath = (org, app) => `/designer/api/user/starred/${org}/${app}`; // Put, Delete
