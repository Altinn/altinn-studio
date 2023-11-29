import { stringify as s } from 'qs';
import { APP_DEVELOPMENT_BASENAME } from '../constants';

// Base path
const basePath = '/designer/api';

// ApplicationMetaData
export const appMetadataPath = (org, app) => `${basePath}/${org}/${app}/metadata`; // Get, Put, Post
export const appMetadataAttachmentPath = (org, app) => `${basePath}/${org}/${app}/metadata/attachment-component`; // Post, Put, Delete

// Config
export const serviceConfigPath = (org, app) => `${basePath}/${org}/${app}/config`; // Get, Post

// Datamodel
export const createDatamodelPath = (org, app) => `${basePath}/${org}/${app}/datamodels/new`; // Post
export const datamodelPath = (org, app, modelPath, saveOnly = false) => `${basePath}/${org}/${app}/datamodels/datamodel?${s({ modelPath, saveOnly })}`; // Get, Put, Delete
export const datamodelsPath = (org, app) => `${basePath}/${org}/${app}/datamodels/all-json`; // Get
export const datamodelsXsdPath = (org, app) => `${basePath}/${org}/${app}/datamodels/all-xsd`; // Get
export const datamodelsUploadPath = (org, app) => `${basePath}/${org}/${app}/datamodels/upload`; // Post
export const datamodelAddXsdFromRepoPath = (org, app, filePath) => `${basePath}/${org}/${app}/datamodels/xsd-from-repo?${s({ filePath })}`; // Post
export const datamodelUploadPagePath = (org, app) => `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/datamodel`;

// Deployment
// See frontend/app-development/utils/urlHelper.ts Deployments

// FormEditor
export const ruleHandlerPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/rule-handler?${s({ layoutSetName })}`; // Get, Post
export const widgetSettingsPath = (org, app) => `${basePath}/${org}/${app}/app-development/widget-settings`; // Get
export const optionListIdsPath = (org, app) => `${basePath}/${org}/${app}/app-development/option-list-ids`; // Get
export const ruleConfigPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/rule-config?${s({ layoutSetName })}`; // Get, Post
export const layoutSetPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/layout-sets?${s({ layoutSetName })}`; // Put, Post
export const layoutSetsPath = (org, app) => `${basePath}/${org}/${app}/app-development/layout-sets`; // Get
export const layoutSettingsPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/layout-settings?${s({ layoutSetName })}`; // Get, Post
export const formLayoutsPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/form-layouts?${s({ layoutSetName })}`; // Get
export const formLayoutPath = (org, app, layout, layoutSetName) => `${basePath}/${org}/${app}/app-development/form-layout/${layout}?${s({ layoutSetName })}`; // Post, Delete
export const formLayoutNamePath = (org, app, layoutName, layoutSetName) => `${basePath}/${org}/${app}/app-development/form-layout-name/${layoutName}?${s({ layoutSetName })}`; // Put
export const frontEndSettingsPath = (org, app) => `${basePath}/${org}/${app}/app-development/front-end-settings`; // Get

// Frontend-language
export const frontendLangPath = (locale) => `/designer/frontend/lang/${locale}.json`;

// Gitea
export const gitCommitPath = (org, app, commitId) => `/repos/${org}/${app}/commit/${commitId}`;
export const repositoryGitPath = (org, app) => `/repos/${org}/${app}.git`;
export const repositoryPath = (org, app) => `/repos/${org}/${app}`;
export const publishPath = (org, app) => `/editor/${org}/${app}/deploy`;
export const repositoryOwnerPath = (org) => `/repos/${org}`;
export const repositoryBasePath = () => `/repos`;
export const userLogoutPath = () => `/repos/user/logout`;

// Home
export const userLogoutAfterPath = () => `/Home/Logout`;

// Languages - new text-format
export const languagesPath = (org, app) => `${basePath}/${org}/${app}/languages`; // Get

// Model
export const datamodelMetadataPath = (org, app) => `${basePath}/${org}/${app}/model/metadata`; // Get

// Organizations
export const orgsListPath = () => `${basePath}/orgs`; // Get

// Preview
export const previewPath = (org, app) => `/preview/${org}/${app}`;
export const instanceIdForPreviewPath = (org, app) => `${basePath}/${org}/${app}/mock-instance-id`; // Get
export const previewPage = (org, app, selectedLayoutSet) => `/designer/html/preview.html?${s({ org, app, selectedLayoutSet })}`;

//Editor
export const editorPath = (org, app) => `/editor/${org}/${app}`;

// Preview - SignalR Hub
export const previewSignalRHubSubPath = () => `/previewHub`;

// Release and Deployment
// See frontend/app-development/utils/urlHelper.ts Releases
export const releasesPath = (org, app, sortDirection) => `${basePath}/${org}/${app}/releases?${s({ sortDirection })}`;
export const deploymentsPath = (org, app, sortDirection) => `${basePath}/${org}/${app}/deployments?${s({ sortDirection })}`;
export const deployPermissionsPath = (org, app) => `${basePath}/${org}/${app}/deployments/permissions`;
export const envConfigPath = () => `${basePath}/environments`;

// Repositories
export const abortmergePath = (org, app) => `${basePath}/repos/repo/${org}/${app}/abort-merge`;
export const branchStatusPath = (org, app, branch) => `${basePath}/repos/repo/${org}/${app}/branches/branch?${s({ branch })}`; // Get
export const cloneAppPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/clone`; // Get
export const copyAppPath = (org, sourceRepository, targetRepository) => `${basePath}/repos/repo/${org}/copy-app?${s({ sourceRepository, targetRepository })}`;
export const createRepoPath = () => `${basePath}/repos/create-app`; // Post
export const discardChangesPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/discard`; // Get
export const discardFileChangesPath = (org, app, filename) => `${basePath}/repos/repo/${org}/${app}/discard/${filename}`; // Get
export const masterRepoStatusPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/branches/branch?branch=master`; // Get
export const repoBranchesPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/branches`; // Get
export const repoCommitPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/commit`; // Post
export const repoCommitPushPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/commit-and-push`; // Post
export const repoDownloadPath = (org, app, full) => `${basePath}/repos/repo/${org}/${app}/contents.zip?${s({ full })}`;
export const repoInitialCommitPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/initial-commit`; // Get
export const repoLatestCommitPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/latest-commit`; // Get
export const repoLogPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/log`; // Get
export const repoMetaPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/metadata`; // Get
export const repoPullPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/pull`; // Get
export const repoPushPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/push`; // Post
export const repoResetPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/reset`; // Get
export const repoSearchPath = () => `${basePath}/repos/search`; // Get
export const repoStatusPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/status`; // Get
export const reposListPath = (org) => `${basePath}/repos/org/${org}`; // Get
export const stageFilePath = (org, app, filename) => `${basePath}/repos/repo/${org}/${app}/stage/${filename}`; // Get

// Session
export const keepAlivePath = () => `${basePath}/session/keepalive`; // Get
export const remainingSessionTimePath = () => `${basePath}/session/remaining`; // Get

// Text - old
export const textLanguagesPath = (org, app) => `${basePath}/${org}/${app}/text/languages`; // Get
export const textResourcesPath = (org, app, langCode) => `${basePath}/${org}/${app}/text/language/${langCode}`; // Get, Post, Put, Delete
export const serviceNamePath = (org, app) => `${basePath}/${org}/${app}/text/service-name`; // Get
export const textResourceIdsPath = (org, app) => `${basePath}/${org}/${app}/text/keys`; // Put

// Text - new

// User
export const userCurrentPath = () => `${basePath}/user/current`; // Get
export const userReposPath = () => `${basePath}/user/repos`; // Get
export const userStarredListPath = () => `${basePath}/user/starred`; // Get
export const userStarredRepoPath = (org, app) => `${basePath}/user/starred/${org}/${app}`; // Put, Delete

// Policy Editor app
export const appPolicyPath = (org, app) => `${basePath}/${org}/${app}/policy`; // Get, Put

// Resourceadm
export const resourcePolicyPath = (org, repo, id) => `${basePath}/${org}/${repo}/policy/${id}`; // Get, Put
export const resourceActionsPath = (org, repo) => `${basePath}/${org}/${repo}/policy/actionoptions`; // Get
export const resourceSubjectsPath = (org, repo) => `${basePath}/${org}/${repo}/policy/subjectoptions`; // Get
export const resourcePublishStatusPath = (org, repo, id) => `${basePath}/${org}/resources/publishstatus/${repo}/${id}`; // Get
export const resourceListPath = (org) => `${basePath}/${org}/resources/resourcelist`; // Get
export const resourceCreatePath = (org) => `${basePath}/${org}/resources/addresource`; // Post
export const resourceSinglePath = (org, repo, id) => `${basePath}/${org}/resources/${repo}/${id}`; // Get
export const resourceEditPath = (org, id) => `${basePath}/${org}/resources/updateresource/${id}`; // Put
export const resourceValidatePolicyPath = (org, repo, id) => `${basePath}/${org}/${repo}/policy/validate/${id}`; // Get
export const resourceValidateResourcePath = (org, repo, id) => `${basePath}/${org}/resources/validate/${repo}/${id}`; // Get
export const publishResourcePath = (org, repo, id, env) => `${basePath}/${org}/resources/publish/${repo}/${id}?env=${env}`; // Get
export const altinn2LinkServicesPath = (org, env) => `${basePath}/${org}/resources/altinn2linkservices/${env}`; // Get
export const importResourceFromAltinn2Path = (org, env, serviceCode, serviceEdition) => `${basePath}/${org}/resources/importresource/${serviceCode}/${serviceEdition}/${env}`; // Post

// Process Editor
export const processEditorPath = (org, repo) => `${basePath}/${org}/${repo}/process-modelling/process-definition`;
export const appLibVersionPath = (org, app) => `${basePath}/${org}/${app}/app-development/app-lib-version`;
