import { stringify as s } from 'qs';
import { PREVIEW_MOCK_PARTY_ID, PREVIEW_MOCK_INSTANCE_GUID } from '../constants';

const basePath = '/designer';
const apiBasePath = `${basePath}/api`;

export const authStatusAnsattporten = () => `${apiBasePath}/ansattporten/auth-status`;
export const loginWithAnsattPorten = (redirectTo) => `${apiBasePath}/ansattporten/login?redirect_to=${redirectTo}`;
export const availableMaskinportenScopesPath = (org, app) => `${apiBasePath}/${org}/${app}/app-scopes/maskinporten`;
export const selectedMaskinportenScopesPath = (org, app) => `${apiBasePath}/${org}/${app}/app-scopes`;

// ApplicationMetadata
export const appMetadataPath = (org, app) => `${apiBasePath}/${org}/${app}/metadata`;
export const appMetadataAttachmentPath = (org, app) => `${apiBasePath}/${org}/${app}/metadata/attachment-component`;

// App version
export const appVersionPath = (org, app) => `${apiBasePath}/${org}/${app}/app-development/app-version`;

// UserOrgPermissions
export const userOrgPermissionsPath = (org) => `${apiBasePath}/user/org-permissions/${org}`;

// Config
export const serviceConfigPath = (org, app) => `${apiBasePath}/${org}/${app}/config`;

// DataModel
export const createDataModelPath = (org, app) => `${apiBasePath}/${org}/${app}/datamodels/new`;
export const dataModelPath = (org, app, modelPath, saveOnly = false) =>
  `${apiBasePath}/${org}/${app}/datamodels/datamodel?${s({
    modelPath,
    saveOnly,
  })}`;
export const dataTypePath = (org, app, dataModelName) => `${apiBasePath}/${org}/${app}/datamodels/datamodel/${dataModelName}/dataType`;
export const dataModelsJsonPath = (org, app) => `${apiBasePath}/${org}/${app}/datamodels/json`;
export const dataModelsXsdPath = (org, app) => `${apiBasePath}/${org}/${app}/datamodels/xsd`;
export const dataModelsUploadPath = (org, app) => `${apiBasePath}/${org}/${app}/datamodels/upload`;
export const dataModelAddXsdFromRepoPath = (org, app, filePath) => `${apiBasePath}/${org}/${app}/datamodels/xsd-from-repo?${s({ filePath })}`;

// Deployment
// See frontend/app-development/utils/urlHelper.ts Deployments

// Feedback form
export const submitFeedbackPath = (org, app) => `${apiBasePath}/${org}/${app}/feedbackform/submit`;

// FormEditor
export const ruleHandlerPath = (org, app, layoutSetName) => `${apiBasePath}/${org}/${app}/app-development/rule-handler?${s({ layoutSetName })}`;
export const widgetSettingsPath = (org, app) => `${apiBasePath}/${org}/${app}/app-development/widget-settings`;
export const optionListPath = (org, app, optionsListId) => `${apiBasePath}/${org}/${app}/options/${optionsListId}`;
export const optionListsPath = (org, app) => `${apiBasePath}/${org}/${app}/options/option-lists`;
export const optionListReferencesPath = (org, app) => `${apiBasePath}/${org}/${app}/options/usage`;
export const optionListIdsPath = (org, app) => `${apiBasePath}/${org}/${app}/options`;
export const optionListUpdatePath = (org, app, optionsListId) => `${apiBasePath}/${org}/${app}/options/${optionsListId}`;
export const optionListIdUpdatePath = (org, app, optionsListId) => `${apiBasePath}/${org}/${app}/options/change-name/${optionsListId}`;
export const optionListUploadPath = (org, app) => `${apiBasePath}/${org}/${app}/options/upload`;
export const importCodeListFromOrgPath = (org, app, codeListId) => `${apiBasePath}/${org}/${app}/options/import/${codeListId}`;
export const ruleConfigPath = (org, app, layoutSetName) => `${apiBasePath}/${org}/${app}/app-development/rule-config?${s({ layoutSetName })}`;
export const appMetadataModelIdsPath = (org, app, onlyUnReferenced) => `${apiBasePath}/${org}/${app}/app-development/model-ids?${s({ onlyUnReferenced })}`;
export const dataModelMetadataPath = (org, app, layoutSetName, dataModelName) => `${apiBasePath}/${org}/${app}/app-development/model-metadata?${s({ layoutSetName })}&${s({ dataModelName })}`;
export const layoutNamesPath = (org, app) => `${apiBasePath}/${org}/${app}/app-development/layout-names`;
export const layoutSetsPath = (org, app) => `${apiBasePath}/${org}/${app}/app-development/layout-sets`;
export const layoutSetsExtendedPath = (org, app) => `${apiBasePath}/${org}/${app}/app-development/layout-sets/extended`;
export const layoutSetPath = (org, app, layoutSetIdToUpdate) => `${apiBasePath}/${org}/${app}/app-development/layout-set/${layoutSetIdToUpdate}`;
export const layoutSettingsPath = (org, app, layoutSetName) => `${apiBasePath}/${org}/${app}/app-development/layout-settings?${s({ layoutSetName })}`;
export const formLayoutsPath = (org, app, layoutSetName) => `${apiBasePath}/${org}/${app}/app-development/form-layouts?${s({ layoutSetName })}`;
export const formLayoutPath = (org, app, layout, layoutSetName) => `${apiBasePath}/${org}/${app}/app-development/form-layout/${layout}?${s({ layoutSetName })}`;
export const formLayoutNamePath = (org, app, layoutName, layoutSetName) => `${apiBasePath}/${org}/${app}/app-development/form-layout-name/${layoutName}?${s({ layoutSetName })}`;
export const frontEndSettingsPath = (org, app) => `${apiBasePath}/${org}/${app}/app-development/front-end-settings`;
export const layoutPath = (org, app, layoutSetName) => `${apiBasePath}/${org}/${app}/layouts/layoutSet/${layoutSetName}`;
export const layoutPagesPath = (org, app, layoutSetName, pageName) => `${layoutPath(org, app, layoutSetName)}/pages/${pageName ? pageName : ''}`;
export const layoutPageGroupsPath = (org, app, layoutSetName) => `${layoutPath(org, app, layoutSetName)}/page-groups/`;
export const layoutConvertToPageGroupsPath = (org, app, layoutSetName) => `${layoutPath(org, app, layoutSetName)}/convert-to-pagegroups/`;
export const layoutConvertToPageOrderPath = (org, app, layoutSetName) => `${layoutPath(org, app, layoutSetName)}/convert-to-pageorder/`;
export const taskNavigationGroupPath = (org, app) => `${apiBasePath}/${org}/${app}/task-navigation`;

// Gitea
export const gitCommitPath = (org, app, commitId) => `/repos/${org}/${app}/commit/${commitId}`;
export const repositoryGitPath = (org, app) => `/repos/${org}/${app}.git`;
export const repositoryPath = (org, app) => `/repos/${org}/${app}`;
export const repositoryLayoutPath = (org, app, layout) => `/repos/${org}/${app}/src/branch/master/App/ui/form/layouts/${layout}.json`;
export const repositoryBranchesPath = (org, app) => `/repos/api/v1/repos/${org}/${app}/branches`;
export const repositoryCurrentBranchPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/current-branch`;
export const publishPath = (org, app) => `/editor/${org}/${app}/deploy`;
export const repositoryOwnerPath = (org) => `/repos/${org}`;
export const repositoryBasePath = () => `/repos`;
export const userLogoutPath = () => `/repos/user/logout`;

// Home
export const userLogoutAfterPath = () => `/Home/Logout`;

// Images
export const addImagePath = (org, app) => `${apiBasePath}/${org}/${app}/images`;
export const imagePath = (org, app, imageFilePath) => `${apiBasePath}/${org}/${app}/images/${encodeURIComponent(imageFilePath)}`;
export const validateImageFromExternalUrlPath = (org, app, url) => `${apiBasePath}/${org}/${app}/images/validate?${s({ url })}`;
export const getImageFileNamesPath = (org, app) => `${apiBasePath}/${org}/${app}/images/fileNames`;

// Library - org-level
export const orgCodeListsPath = (org) => `${apiBasePath}/${org}/code-lists`;
export const orgCodeListPath = (org, codeListId) => `${apiBasePath}/${org}/code-lists/${codeListId}`;
export const orgCodeListUpdateIdPath = (org, codeListId) => `${apiBasePath}/${org}/code-lists/change-name/${codeListId}`;
export const orgCodeListUploadPath = (org) => `${apiBasePath}/${org}/code-lists/upload`;
export const orgTextResourcesPath = (org, language) => `${apiBasePath}/${org}/text/language/${language}`;
export const orgTextLanguagesPath = (org) => `${apiBasePath}/${org}/text/languages`;
export const availableResourcesInOrgLibraryPath = (org, contentType) => `${apiBasePath}/${org}/content?${s({ contentType })}`;

// Organizations
export const orgsListPath = () => `${apiBasePath}/orgs`;

// Preview
export const previewHash = (taskId, selectedLayout, instanceId) => `#/instance/${PREVIEW_MOCK_PARTY_ID}/${instanceId}/${taskId}/${selectedLayout}`;
export const previewPage = (org, app, selectedLayoutSet, taskId, selectedLayout, instanceId = PREVIEW_MOCK_INSTANCE_GUID) => `/app-specific-preview/${org}/${app}?${s({ selectedLayoutSet })}${taskId && instanceId ? previewHash(taskId, selectedLayout, instanceId) : ''}`;

// Release and Deployment
// See frontend/app-development/utils/urlHelper.ts Releases
export const releasesPath = (org, app, sortDirection) => `${apiBasePath}/${org}/${app}/releases?${s({ sortDirection })}`;
export const deploymentsPath = (org, app, sortDirection) => `${apiBasePath}/${org}/${app}/deployments?${s({ sortDirection })}`;
export const deployPermissionsPath = (org, app) => `${apiBasePath}/${org}/${app}/deployments/permissions`;
export const envConfigPath = () => `${apiBasePath}/environments`;
export const undeployAppFromEnvPath = (org, app) => `${apiBasePath}/${org}/${app}/deployments/undeploy`;

// Repositories
export const branchStatusPath = (org, app, branch) => `${apiBasePath}/repos/repo/${org}/${app}/branches/branch?${s({ branch })}`;
export const copyAppPath = (org, sourceRepository, targetRepository, targetOrg) =>
  `${apiBasePath}/repos/repo/${org}/copy-app?${s({
    sourceRepository,
    targetRepository,
    targetOrg,
  })}`;
export const createRepoPath = () => `${apiBasePath}/repos/create-app`;
export const repoCommitPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/commit`;
export const repoCommitPushPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/commit-and-push`;
export const repoDownloadPath = (org, app, full) => `${apiBasePath}/repos/repo/${org}/${app}/contents.zip?${s({ full })}`;
export const repoLatestCommitPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/latest-commit`;
export const repoMetaPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/metadata`;
export const repoPullPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/pull`;
export const repoPushPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/push`;
export const repoResetPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/reset`;
export const setRepoBranchPath = (org, app, branch) => `${apiBasePath}/repos/repo/${org}/${app}/reset?branch=${encodeURIComponent(branch)}`;
export const repoSearchPath = () => `${apiBasePath}/repos/search`;
export const repoStatusPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/status`;
export const repoDiffPath = (org, app) => `${apiBasePath}/repos/repo/${org}/${app}/diff`;
export const reposListPath = (org) => `${apiBasePath}/repos/org/${org}`;
export const stageFilePath = (org, app, filename) => `${apiBasePath}/repos/repo/${org}/${app}/stage/${filename}`;

// Text - old
export const textLanguagesPath = (org, app) => `${apiBasePath}/${org}/${app}/text/languages`;
export const textResourcesPath = (org, app, langCode) => `${apiBasePath}/${org}/${app}/text/language/${langCode}`;
export const textResourceIdsPath = (org, app) => `${apiBasePath}/${org}/${app}/text/keys`;

// Text - new

// User
export const userCurrentPath = () => `${apiBasePath}/user/current`;
export const userReposPath = () => `${apiBasePath}/user/repos`;
export const userStarredListPath = () => `${apiBasePath}/user/starred`;
export const userStarredRepoPath = (org, app) => `${apiBasePath}/user/starred/${org}/${app}`;

// Policy Editor app
export const appPolicyPath = (org, app) => `${apiBasePath}/${org}/${app}/policy`;

// Resourceadm
export const resourcePolicyPath = (org, repo, id) => `${apiBasePath}/${org}/${repo}/policy/${id}`;
export const resourceActionsPath = (org, repo) => `${apiBasePath}/${org}/${repo}/policy/actionoptions`;
export const resourceSubjectsPath = (org, repo) => `${apiBasePath}/${org}/${repo}/policy/subjectoptions`;
export const resourceAccessPackagesPath = (org, repo) => `${apiBasePath}/${org}/${repo}/policy/accesspackageoptions`;
export const resourceAccessPackageServicesPath = (accessPackageUrn, env) => `${apiBasePath}/accesspackageservices/${accessPackageUrn}/${env}`;
export const resourcePublishStatusPath = (org, repo, id) => `${apiBasePath}/${org}/resources/publishstatus/${repo}/${id}`;
export const resourceListPath = (org) => `${apiBasePath}/${org}/resources/resourcelist?includeEnvResources=true`;
export const resourceCreatePath = (org) => `${apiBasePath}/${org}/resources/addresource`;
export const resourceSinglePath = (org, repo, id) => `${apiBasePath}/${org}/resources/${repo}/${id}`;
export const resourceEditPath = (org, id) => `${apiBasePath}/${org}/resources/updateresource/${id}`;
export const resourceValidatePolicyPath = (org, repo, id) => `${apiBasePath}/${org}/${repo}/policy/validate/${id}`;
export const resourceValidateResourcePath = (org, repo, id) => `${apiBasePath}/${org}/resources/validate/${repo}/${id}`;
export const publishResourcePath = (org, repo, id, env) => `${apiBasePath}/${org}/resources/publish/${repo}/${id}/${env}`;
export const altinn2LinkServicesPath = (org, env) => `${apiBasePath}/${org}/resources/altinn2linkservices/${env}`;
export const importResourceFromAltinn2Path = (org, env, serviceCode, serviceEdition) => `${apiBasePath}/${org}/resources/importresource/${serviceCode}/${serviceEdition}/${env}`;
export const accessListsPath = (org, env, page) => `${apiBasePath}/${env}/${org}/resources/accesslist/${page ? `?page=${page}` : ''}`;
export const allAccessListsPath = (org) => `${apiBasePath}/${org}/resources/allaccesslists/`;
export const importResourceFromAltinn3Path = (org, resourceId, env) => `${apiBasePath}/${org}/resources/addexistingresource/${resourceId}/${env}`;
export const createAccessListsPath = (org, env) => `${apiBasePath}/${env}/${org}/resources/accesslist/`;
export const accessListPath = (org, listId, env, etag = '') => `${apiBasePath}/${env}/${org}/resources/accesslist/${listId}${etag ? `?etag=${etag}` : ''}`;
export const accessListMemberPath = (org, listId, env, page) => `${apiBasePath}/${env}/${org}/resources/accesslist/${listId}/members/${page ? `?page=${page}` : ''}`;
export const resourceAccessListsPath = (org, resourceId, env, page) => `${apiBasePath}/${env}/${org}/resources/${resourceId}/accesslists/${page ? `?page=${page}` : ''}`;
export const resourceAccessListPath = (org, resourceId, listId, env) => `${apiBasePath}/${env}/${org}/resources/${resourceId}/accesslists/${listId}`;
export const altinn2DelegationsCountPath = (org, serviceCode, serviceEdition, env) => `${apiBasePath}/${org}/resources/altinn2/delegationcount/${serviceCode}/${serviceEdition}/${env}`;
export const altinn2DelegationsMigrationPath = (org, env) => `${apiBasePath}/${org}/resources/altinn2/delegationmigration/${env}`;
export const consentTemplatesPath = (org) => `${apiBasePath}/${org}/resources/consenttemplates/`;

// Preview
export const instancesPath = (org, app) => `/${org}/${app}/instances`;
export const createInstancePath = (org, app, partyId, taskId) => `${instancesPath(org, app)}?instanceOwnerPartyId=${partyId}&taskId=${taskId}`;

// Process Editor
export const processEditorPath = (org, app) => `${apiBasePath}/${org}/${app}/process-modelling/process-definition`;
export const processEditorDataTypesChangePath = (org, app) => `${apiBasePath}/${org}/${app}/process-modelling/data-types`;
export const processTaskTypePath = (org, app, taskId) => `${apiBasePath}/${org}/${app}/process-modelling/task-type/${taskId}`;
export const processEditorDataTypePath = (org, app, dataTypeId, taskId) => `${apiBasePath}/${org}/${app}/process-modelling/data-type/${dataTypeId}?${s({ taskId })}`;

// Env
export const envFilePath = () => `${basePath}/config/env.json`;

// Event Hubs
export const syncEventsWebSocketHub = () => '/hubs/sync';
export const syncEntityUpdateWebSocketHub = () => '/hubs/entity-updated';
export const previewWebSocketHub = () => `/hubs/preview`;
export const altinityWebSocketHub = () => '/hubs/altinity';

// Contact
export const belongsToOrg = () => `${apiBasePath}/contact/belongs-to-org`;

// Can use feature
export const canUseFeaturePath = (featureName) => `${apiBasePath}/canUseFeature?featureName=${featureName}`;
