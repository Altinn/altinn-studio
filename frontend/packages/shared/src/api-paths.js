import { stringify as s } from 'qs';

// ApplicationMetaData
export const appMetadataPath = (org, app) => `/designer/api/${org}/${app}/app-metadata`; // Get, Put, Post
export const appMetadataAttachmentPath = (org, app) => `/designer/api/${org}/${app}/app-metadata/attachment-component`; // Post, Put, Delete

// Config
export const serviceConfigPath = (org, app) => `/designer/api/${org}/${app}/config/service`; // Get, Post

// Datamodel
export const createDatamodelPath = (org, app) => `/designer/api/${org}/${app}/datamodels/new`; // Post
export const datamodelPath = (org, app, modelPath) => `/designer/api/${org}/${app}/datamodels/datamodel?${s({modelPath})}`; // Get, Put, Delete
export const datamodelsPath = (org, app) => `/designer/api/${org}/${app}/datamodels/get-all-json`; // Get
export const datamodelsXsdPath = (org, app) => `/designer/api/${org}/${app}/datamodels/get-all-xsd`; // Get
export const datamodelsUploadPath = (org, app) => `/designer/api/${org}/${app}/datamodels/upload`; // Post
export const datamodelAddXsdFromRepoPath = (org, app, filePath) => `/designer/api/${org}/${app}/datamodels/xsd-from-repo?${s({filePath})}`; // Post

// Deployment
// See frontend/app-development/utils/urlHelper.ts Deployments

// FormEditor
export const ruleHandlerPath = (org, app) => `/designer/api/${org}/${app}/form-editor/rule-handler`; // Get
export const saveRuleHandlerPath = (org, app, stageFile) => `/designer/api/${org}/${app}/form-editor/rule-handler?${stageFile}`; // Get
export const widgetSettingsPath = (org, app) => `/designer/api/${org}/${app}/form-editor/widget-settings`; // Get
export const ruleConfigPath = (org, app) => `/designer/api/${org}/${app}/form-editor/rule-config`; // Get, Post
export const layoutSettingsPath = (org, app) => `/designer/api/${org}/${app}/form-editor/layout-settings`; // Get, Post
export const formLayoutsPath = (org, app) => `/designer/api/${org}/${app}/form-editor/form-layouts`; // Get
export const formLayoutPath = (org, app, layout) => `/designer/api/${org}/${app}/form-editor/form-layout/${layout}`; // Post, Delete
export const formLayoutNamePath = (org, app, layoutName) => `/designer/api/${org}/${app}/form-editor/form-layout-name/${layoutName}`; // Put

// Frontend-language
export const frontendLangPath = (locale) => `/designer/frontend/lang/${locale}.json`;

// Gitea
export const gitCommitPath = (org, app, commitId) => `/repos/${org}/${app}/commit/${commitId}`;
export const repositoryGitPath = (org, app) => `/repos/${org}/${app}.git`;
export const repositoryPath = (org, app) => `/repos/${org}/${app}`;
export const repositoryOwnerPath = (org) => `/repos/${org}`;
export const repositoryBasePath = () => '/repos';
export const userLogoutPath = () => '/repos/user/logout';

// Home
export const userLogoutAfterPath = () => '/Home/Logout';

// Languages - new text-format
export const languagesPath = (org, app) => `/designer/api/${org}/${app}/languages`; // Get

// Model
export const datamodelCsharpPath = (org, app) => `/designer/api/${org}/${app}/model/get-csharp`; // Get
export const datamodelJsonSchemaPath = (org, app) => `/designer/api/${org}/${app}/model/get-json-schema`; // Get
export const datamodelMetadataPath = (org, app) => `/designer/api/${org}/${app}/model/get-metadata`; // Get
export const datamodelXsdPath = (org, app) => `/designer/api/${org}/${app}/model/get-xsd`; // Get

// Organizations
export const orgsListPath = () => '/designer/api/orgs'; // Get

// Release
// See frontend/app-development/utils/urlHelper.ts Releases

// Repositories
export const abortmergePath = (org, app) => `/designer/api/repos/repo/${org}/${app}/abort-merge`;
export const cloneAppPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/clone`; // Get
export const copyAppPath = (org, sourceRepository, targetRepository) => `/designer/api/repos/copy-app?${s({org, sourceRepository, targetRepository,})}`; // Post
export const createRepoPath = () => `/designer/api/repos/create-app`; // Post
export const discardChangesPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/discard`; // Get
export const discardFileChangesPath = (org, app, filename) => `/designer/api/repos/repo/${org}/${app}/discard/${filename}`; // Get
export const masterRepoStatusPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/branches?branch=master`; // Get
export const repoBranchesPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/branches`; // Get
export const repoBranchStatusPath = (org, app, branch) => `/designer/api/repos/repo/${org}/${app}/branches?branch=${branch}}`; // Get
export const repoCommitPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/commit`; // Post
export const repoCommitPushPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/commit-and-push`; // Post
export const repoDownloadPath = (org, app, full) => `/designer/api/repos/repo/${org}/${app}/contents.zip?${s({ full })}`;
export const repoInitialCommitPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/initial-commit`; // Get
export const repoLatestCommitPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/latest-commit`; // Get
export const repoLogPath = (org, app) => `/designer/api/repos/repo/${org}/${app}/log`; // Get
export const repoMetaPath = (org, app) => `/designer/api/repos/repo/${org}/${app}`; // Get
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
export const textResourcesAddPath = (org, app) => `/designer/api/${org}/${app}/text/language/add-texts`; // Post
export const serviceNamePath = (org, app) => `/designer/api/${org}/${app}/text/service-name`; // Get, Post
export const textResourceIdsPath = (org, app) => `/designer/${org}/${app}/text/keys`; // Put

// Text - new

// User
export const userCurrentPath = () => '/designer/api/user/current'; // Get
export const userReposPath = () => '/designer/api/user/repos'; // Get
export const userStarredListPath = () => '/designer/api/user/starred'; // Get
export const userStarredRepoPath = (org, app) => `/designer/api/user/starred/${org}/${app}`; // Put, Delete

// Deprecated
export const getServiceFilesPath = (org, app, fileEditorMode) => `/designer/api/${org}/${app}/service-development/get-all?${s({fileEditorMode,})}`; // Get
