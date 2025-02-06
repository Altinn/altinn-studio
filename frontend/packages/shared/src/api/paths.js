import { stringify as s } from 'qs';
import { PREVIEW_MOCK_PARTY_ID, PREVIEW_MOCK_INSTANCE_GUID } from '../constants';

// Base path
const basePath = '/designer/api';

// Ansattporten
export const authStatusAnsattporten = () => `${basePath}/ansattporten/auth-status`;
export const loginWithAnsattPorten = (redirectTo) => `${basePath}/ansattporten/login?redirect_to=${redirectTo}`;
export const availableMaskinportenScopesPath = (org, app) => `${basePath}/${org}/${app}/app-scopes/maskinporten`; // Get
export const selectedMaskinportenScopesPath = (org, app) => `${basePath}/${org}/${app}/app-scopes`; // Get, Put

// ApplicationMetadata
export const appMetadataPath = (org, app) => `${basePath}/${org}/${app}/metadata`; // Get, Put, Post
export const appMetadataAttachmentPath = (org, app) => `${basePath}/${org}/${app}/metadata/attachment-component`; // Post, Put, Delete

// App version
export const appVersionPath = (org, app) => `${basePath}/${org}/${app}/app-development/app-version`; // Get

// UserOrgPermissions
export const userOrgPermissionsPath = (org) => `${basePath}/user/org-permissions/${org}`;

// Config
export const serviceConfigPath = (org, app) => `${basePath}/${org}/${app}/config`; // Get, Post

// DataModel
export const createDataModelPath = (org, app) => `${basePath}/${org}/${app}/datamodels/new`; // Post
export const dataModelPath = (org, app, modelPath, saveOnly = false) =>
  `${basePath}/${org}/${app}/datamodels/datamodel?${s({
    modelPath,
    saveOnly,
  })}`; // Get, Put, Delete
export const dataTypePath = (org, app, dataModelName) => `${basePath}/${org}/${app}/datamodels/datamodel/${dataModelName}/dataType`;
export const dataModelsPath = (org, app) => `${basePath}/${org}/${app}/datamodels/all-json`; // Get
export const dataModelsXsdPath = (org, app) => `${basePath}/${org}/${app}/datamodels/all-xsd`; // Get
export const dataModelsUploadPath = (org, app) => `${basePath}/${org}/${app}/datamodels/upload`; // Post
export const dataModelAddXsdFromRepoPath = (org, app, filePath) => `${basePath}/${org}/${app}/datamodels/xsd-from-repo?${s({ filePath })}`; // Post

// Deployment
// See frontend/app-development/utils/urlHelper.ts Deployments

// Feedback form
export const submitFeedbackPath = (org, app) => `${basePath}/${org}/${app}/feedbackform/submit`; // Post

// FormEditor
export const ruleHandlerPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/rule-handler?${s({ layoutSetName })}`; // Get, Post
export const widgetSettingsPath = (org, app) => `${basePath}/${org}/${app}/app-development/widget-settings`; // Get
export const optionListPath = (org, app, optionsListId) => `${basePath}/${org}/${app}/options/${optionsListId}`; // Get, Delete
export const optionListsPath = (org, app) => `${basePath}/${org}/${app}/options/option-lists`; // Get
export const optionListReferencesPath = (org, app) => `${basePath}/${org}/${app}/options/usage`; // Get
export const optionListIdsPath = (org, app) => `${basePath}/${org}/${app}/options`; // Get
export const optionListUpdatePath = (org, app, optionsListId) => `${basePath}/${org}/${app}/options/${optionsListId}`; // Put
export const optionListIdUpdatePath = (org, app, optionsListId) => `${basePath}/${org}/${app}/options/change-name/${optionsListId}`; // Put
export const optionListUploadPath = (org, app) => `${basePath}/${org}/${app}/options/upload`; // Post
export const ruleConfigPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/rule-config?${s({ layoutSetName })}`; // Get, Post
export const appMetadataModelIdsPath = (org, app, onlyUnReferenced) => `${basePath}/${org}/${app}/app-development/model-ids?${s({ onlyUnReferenced })}`; // Get
export const dataModelMetadataPath = (org, app, layoutSetName, dataModelName) => `${basePath}/${org}/${app}/app-development/model-metadata?${s({ layoutSetName })}&${s({ dataModelName })}`; // Get
export const layoutNamesPath = (org, app) => `${basePath}/${org}/${app}/app-development/layout-names`; // Get
export const layoutSetsPath = (org, app) => `${basePath}/${org}/${app}/app-development/layout-sets`; // Get
export const layoutSetPath = (org, app, layoutSetIdToUpdate) => `${basePath}/${org}/${app}/app-development/layout-set/${layoutSetIdToUpdate}`; // Put, Delete
export const layoutSettingsPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/layout-settings?${s({ layoutSetName })}`; // Get, Post
export const formLayoutsPath = (org, app, layoutSetName) => `${basePath}/${org}/${app}/app-development/form-layouts?${s({ layoutSetName })}`; // Get
export const formLayoutPath = (org, app, layout, layoutSetName) => `${basePath}/${org}/${app}/app-development/form-layout/${layout}?${s({ layoutSetName })}`; // Post, Delete
export const formLayoutNamePath = (org, app, layoutName, layoutSetName) => `${basePath}/${org}/${app}/app-development/form-layout-name/${layoutName}?${s({ layoutSetName })}`; // Put
export const frontEndSettingsPath = (org, app) => `${basePath}/${org}/${app}/app-development/front-end-settings`; // Get

// Gitea
export const gitCommitPath = (org, app, commitId) => `/repos/${org}/${app}/commit/${commitId}`;
export const repositoryGitPath = (org, app) => `/repos/${org}/${app}.git`;
export const repositoryPath = (org, app) => `/repos/${org}/${app}`;
export const repositoryLayoutPath = (org, app, layout) => `/repos/${org}/${app}/src/branch/master/App/ui/form/layouts/${layout}.json`;
export const publishPath = (org, app) => `/editor/${org}/${app}/deploy`;
export const repositoryOwnerPath = (org) => `/repos/${org}`;
export const repositoryBasePath = () => `/repos`;
export const userLogoutPath = () => `/repos/user/logout`;

// Home
export const userLogoutAfterPath = () => `/Home/Logout`;

// Images
export const allImagesPath = (org, app) => `${basePath}/${org}/${app}/images/all`; // Get
export const addImagePath = (org, app) => `${basePath}/${org}/${app}/images`; // Post
export const imagePath = (org, app, imageFilePath) => `${basePath}/${org}/${app}/images/${encodeURIComponent(imageFilePath)}`; // Get, Delete
export const validateImageFromExternalUrlPath = (org, app, url) => `${basePath}/${org}/${app}/images/validate?${s({ url })}`; // Get
export const getImageFileNamesPath = (org, app) => `${basePath}/${org}/${app}/images/fileNames`; // Get

// Languages - new text-format
export const languagesPath = (org, app) => `${basePath}/${org}/${app}/languages`; // Get

// Library - org-level
export const orgCodeListsPath = (org) => `${basePath}/${org}/code-lists`; // Get
export const orgCodeListPath = (org, codeListId) => `${basePath}/${org}/code-lists/${codeListId}`; // Post, Put, Delete
export const orgCodeListUploadPath = (org) => `${basePath}/${org}/code-lists/upload`; // Post

// Organizations
export const orgsListPath = () => `${basePath}/orgs`; // Get

// Preview
export const previewHash = (taskId, selectedLayout, instanceId) => `#/instance/${PREVIEW_MOCK_PARTY_ID}/${instanceId}/${taskId}/${selectedLayout}`;
export const previewPage = (org, app, selectedLayoutSet, taskId, selectedLayout, instanceId = PREVIEW_MOCK_INSTANCE_GUID) => `/app-specific-preview/${org}/${app}?${s({ selectedLayoutSet })}${taskId && selectedLayout && instanceId ? previewHash(taskId, selectedLayout, instanceId) : ''}`;

// Preview - SignalR Hub
export const previewSignalRHubSubPath = () => `/previewHub`;

// Release and Deployment
// See frontend/app-development/utils/urlHelper.ts Releases
export const releasesPath = (org, app, sortDirection) => `${basePath}/${org}/${app}/releases?${s({ sortDirection })}`;
export const deploymentsPath = (org, app, sortDirection) => `${basePath}/${org}/${app}/deployments?${s({ sortDirection })}`;
export const deployPermissionsPath = (org, app) => `${basePath}/${org}/${app}/deployments/permissions`;
export const envConfigPath = () => `${basePath}/environments`;
export const undeployAppFromEnvPath = (org, app) => `${basePath}/${org}/${app}/deployments/undeploy`;

// Repositories
export const abortmergePath = (org, app) => `${basePath}/repos/repo/${org}/${app}/abort-merge`;
export const branchStatusPath = (org, app, branch) => `${basePath}/repos/repo/${org}/${app}/branches/branch?${s({ branch })}`; // Get
export const cloneAppPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/clone`; // Get
export const copyAppPath = (org, sourceRepository, targetRepository, targetOrg) =>
  `${basePath}/repos/repo/${org}/copy-app?${s({
    sourceRepository,
    targetRepository,
    targetOrg,
  })}`;
export const createRepoPath = () => `${basePath}/repos/create-app`; // Post
export const discardChangesPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/discard`; // Get
export const discardFileChangesPath = (org, app, filename) => `${basePath}/repos/repo/${org}/${app}/discard/${filename}`; // Get
export const masterRepoStatusPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/branches/branch?branch=master`; // Get
export const repoBranchesPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/branches`; // Get
export const repoCommitPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/commit`; // Post
export const repoCommitPushPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/commit-and-push`; // Post
export const repoDownloadPath = (org, app, full) => `${basePath}/repos/repo/${org}/${app}/contents.zip?${s({ full })}`;
export const repoLatestCommitPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/latest-commit`; // Get
export const repoLogPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/log`; // Get
export const repoMetaPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/metadata`; // Get
export const repoPullPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/pull`; // Get
export const repoPushPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/push`; // Post
export const repoResetPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/reset`; // Get
export const repoSearchPath = () => `${basePath}/repos/search`; // Get
export const repoStatusPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/status`; // Get
export const repoDiffPath = (org, app) => `${basePath}/repos/repo/${org}/${app}/diff`; // Get
export const reposListPath = (org) => `${basePath}/repos/org/${org}`; // Get
export const stageFilePath = (org, app, filename) => `${basePath}/repos/repo/${org}/${app}/stage/${filename}`; // Get

// Text - old
export const textLanguagesPath = (org, app) => `${basePath}/${org}/${app}/text/languages`; // Get
export const textResourcesPath = (org, app, langCode) => `${basePath}/${org}/${app}/text/language/${langCode}`; // Get, Post, Put, Delete
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
export const resourceAccessPackagesPath = (org, repo) => `${basePath}/${org}/${repo}/policy/accesspackageoptions`; // Get
export const resourceAccessPackageServicesPath = (accessPackageUrn, env) => `${basePath}/accesspackageservices/${accessPackageUrn}/${env}`; // Get
export const resourcePublishStatusPath = (org, repo, id) => `${basePath}/${org}/resources/publishstatus/${repo}/${id}`; // Get
export const resourceListPath = (org) => `${basePath}/${org}/resources/resourcelist?includeEnvResources=true`; // Get
export const resourceCreatePath = (org) => `${basePath}/${org}/resources/addresource`; // Post
export const resourceSinglePath = (org, repo, id) => `${basePath}/${org}/resources/${repo}/${id}`; // Get
export const resourceEditPath = (org, id) => `${basePath}/${org}/resources/updateresource/${id}`; // Put
export const resourceValidatePolicyPath = (org, repo, id) => `${basePath}/${org}/${repo}/policy/validate/${id}`; // Get
export const resourceValidateResourcePath = (org, repo, id) => `${basePath}/${org}/resources/validate/${repo}/${id}`; // Get
export const publishResourcePath = (org, repo, id, env) => `${basePath}/${org}/resources/publish/${repo}/${id}/${env}`; // Get
export const altinn2LinkServicesPath = (org, env) => `${basePath}/${org}/resources/altinn2linkservices/${env}`; // Get
export const importResourceFromAltinn2Path = (org, env, serviceCode, serviceEdition) => `${basePath}/${org}/resources/importresource/${serviceCode}/${serviceEdition}/${env}`; // Post
export const accessListsPath = (org, env, page) => `${basePath}/${env}/${org}/resources/accesslist/${page ? `?page=${page}` : ''}`; // Get
export const importResourceFromAltinn3Path = (org, resourceId, env) => `${basePath}/${org}/resources/addexistingresource/${resourceId}/${env}`; // Post
export const createAccessListsPath = (org, env) => `${basePath}/${env}/${org}/resources/accesslist/`; //  Post
export const accessListPath = (org, listId, env, etag = '') => `${basePath}/${env}/${org}/resources/accesslist/${listId}${etag ? `?etag=${etag}` : ''}`; // Get, Patch, Delete
export const accessListMemberPath = (org, listId, env, page) => `${basePath}/${env}/${org}/resources/accesslist/${listId}/members/${page ? `?page=${page}` : ''}`; // Get, Post, Delete
export const resourceAccessListsPath = (org, resourceId, env, page) => `${basePath}/${env}/${org}/resources/${resourceId}/accesslists/${page ? `?page=${page}` : ''}`; // Get
export const resourceAccessListPath = (org, resourceId, listId, env) => `${basePath}/${env}/${org}/resources/${resourceId}/accesslists/${listId}`; // Post, Delete, Patch
export const altinn2DelegationsCountPath = (org, serviceCode, serviceEdition, env) => `${basePath}/${org}/resources/altinn2/delegationcount/${serviceCode}/${serviceEdition}/${env}`; // Get
export const altinn2DelegationsMigrationPath = (org, env) => `${basePath}/${org}/resources/altinn2/delegationmigration/${env}`; // Post

// Preview
export const instancesPath = (org, app) => `/${org}/${app}/instances`;
export const createInstancePath = (org, app, partyId, taskId) => `${instancesPath(org, app)}?instanceOwnerPartyId=${partyId}&taskId=${taskId}`;

// Process Editor
export const processEditorPath = (org, app) => `${basePath}/${org}/${app}/process-modelling/process-definition`;
export const processEditorDataTypesChangePath = (org, app) => `${basePath}/${org}/${app}/process-modelling/data-types`;
export const processTaskTypePath = (org, app, taskId) => `${basePath}/${org}/${app}/process-modelling/task-type/${taskId}`; // Get
export const processEditorDataTypePath = (org, app, dataTypeId, taskId) => `${basePath}/${org}/${app}/process-modelling/data-type/${dataTypeId}?${s({ taskId })}`;

// Event Hubs
export const SyncEventsWebSocketHub = () => '/sync-hub';

// Contact
export const belongsToOrg = () => `${basePath}/contact/belongs-to-org`;
