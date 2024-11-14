import { get } from 'app-shared/utils/networking';
import {
  altinn2LinkServicesPath,
  appMetadataPath,
  appPolicyPath,
  appVersionPath,
  branchStatusPath,
  dataModelMetadataPath,
  dataModelPath,
  dataModelsPath,
  dataModelsXsdPath,
  deployPermissionsPath,
  deploymentsPath,
  envConfigPath,
  formLayoutsPath,
  frontEndSettingsPath,
  instanceIdForPreviewPath,
  layoutSetsPath,
  layoutSettingsPath,
  optionListIdsPath,
  optionListsPath,
  orgsListPath,
  accessListsPath,
  accessListPath,
  accessListMemberPath,
  processEditorPath,
  releasesPath,
  repoMetaPath,
  repoPullPath,
  repoSearchPath,
  repoStatusPath,
  resourceActionsPath,
  resourceListPath,
  resourcePolicyPath,
  resourcePublishStatusPath,
  resourceSinglePath,
  resourceSubjectsPath,
  resourceValidatePolicyPath,
  resourceValidateResourcePath,
  ruleConfigPath,
  ruleHandlerPath,
  serviceConfigPath,
  textLanguagesPath,
  textResourcesPath,
  userCurrentPath,
  userStarredListPath,
  widgetSettingsPath,
  resourceAccessListsPath,
  layoutNamesPath,
  appMetadataModelIdsPath,
  processTaskTypePath,
  altinn2DelegationsCountPath,
  repoDiffPath,
  getImageFileNamesPath,
  validateImageFromExternalUrlPath,
} from './paths';

import type { AppReleasesResponse, DataModelMetadataResponse, SearchRepoFilterParams, SearchRepositoryResponse } from 'app-shared/types/api';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import type { DataModelMetadataJson, DataModelMetadataXsd } from 'app-shared/types/DataModelMetadata';
import type { Environment } from 'app-shared/types/Environment';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings, ITextResourcesWithLanguage, IFrontEndSettings } from 'app-shared/types/global';
import type { Organization } from 'app-shared/types/Organization';
import type { OrgList } from 'app-shared/types/OrgList';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import type { Repository, User } from 'app-shared/types/Repository';
import type { RuleConfig } from 'app-shared/types/RuleConfig';

import type { WidgetSettingsResponse } from 'app-shared/types/widgetTypes';
import { buildQueryParams } from 'app-shared/utils/urlUtils';
import { orgListUrl } from '../cdn-paths';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { PolicyAction, PolicySubject } from '@altinn/policy-editor';
import type { BrregPartySearchResult, BrregSubPartySearchResult, AccessList, Resource, ResourceListItem, ResourceVersionStatus, Validation, AccessListsResponse, AccessListMembersResponse, DelegationCountOverview } from 'app-shared/types/ResourceAdm';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import type { AppVersion } from 'app-shared/types/AppVersion';
import type { FormLayoutsResponseV3 } from 'app-shared/types/api/FormLayoutsResponseV3';
import type { Policy } from 'app-shared/types/Policy';
import type { RepoDiffResponse } from 'app-shared/types/api/RepoDiffResponse';
import type { ExternalImageUrlValidationResponse } from 'app-shared/types/api/ExternalImageUrlValidationResponse';

export const getIsLoggedInWithAnsattporten = async (): Promise<boolean> =>
  // TODO: replace with endpoint when it's ready in the backend.
  new Promise((resolve) => {
    setTimeout(() => {
      return resolve(false);
    }, 1000);
  });
export const getAppMetadataModelIds = (org: string, app: string, onlyUnReferenced: boolean) => get<string[]>(appMetadataModelIdsPath(org, app, onlyUnReferenced));
export const getAppReleases = (owner: string, app: string) => get<AppReleasesResponse>(releasesPath(owner, app, 'Descending'));
export const getAppVersion = (org: string, app: string) => get<AppVersion>(appVersionPath(org, app));
export const getBranchStatus = (owner: string, app: string, branch: string) => get<BranchStatus>(branchStatusPath(owner, app, branch));
export const getDataModel = (owner: string, app: string, modelPath: string) => get<JsonSchema>(dataModelPath(owner, app, modelPath));
export const getDataModelMetadata = (owner: string, app: string, layoutSetName: string, dataModelName: string) => get<DataModelMetadataResponse>(dataModelMetadataPath(owner, app, layoutSetName, dataModelName));
export const getDataModelsJson = (owner: string, app: string) => get<DataModelMetadataJson[]>(dataModelsPath(owner, app));
export const getDataModelsXsd = (owner: string, app: string) => get<DataModelMetadataXsd[]>(dataModelsXsdPath(owner, app));
export const getDeployPermissions = (owner: string, app: string) => get<string[]>(deployPermissionsPath(owner, app));
export const getDeployments = (owner: string, app: string) => get<DeploymentsResponse>(deploymentsPath(owner, app, 'Descending'));
export const getEnvironments = () => get<Environment[]>(envConfigPath());
export const getFormLayoutSettings = (owner: string, app: string, layoutSetName: string) => get<ILayoutSettings>(layoutSettingsPath(owner, app, layoutSetName));
export const getFormLayouts = (owner: string, app: string, layoutSetName: string) => get<FormLayoutsResponse>(formLayoutsPath(owner, app, layoutSetName));
export const getFormLayoutsV3 = (owner: string, app: string, layoutSetName: string) => get<FormLayoutsResponseV3>(formLayoutsPath(owner, app, layoutSetName));
export const getFrontEndSettings = (owner: string, app: string) => get<IFrontEndSettings>(frontEndSettingsPath(owner, app));
export const getImageFileNames = (owner: string, app: string) => get<string[]>(getImageFileNamesPath(owner, app));
export const getInstanceIdForPreview = (owner: string, app: string) => get<string>(instanceIdForPreviewPath(owner, app));
export const getLayoutNames = (owner: string, app: string) => get<string[]>(layoutNamesPath(owner, app));
export const getLayoutSets = (owner: string, app: string) => get<LayoutSets>(layoutSetsPath(owner, app));
export const getOptionLists = (owner: string, app: string) => get<string[]>(optionListsPath(owner, app));
export const getOptionListIds = (owner: string, app: string) => get<string[]>(optionListIdsPath(owner, app));
export const getOrgList = () => get<OrgList>(orgListUrl());
export const getOrganizations = () => get<Organization[]>(orgsListPath());
export const getRepoMetadata = (owner: string, app: string) => get<Repository>(repoMetaPath(owner, app));
export const getRepoPull = (owner: string, app: string) => get<RepoStatus>(repoPullPath(owner, app));
export const getRepoStatus = (owner: string, app: string) => get<RepoStatus>(repoStatusPath(owner, app));
export const getRepoDiff = (owner: string, app: string) => get<RepoDiffResponse>(repoDiffPath(owner, app));
export const getRuleConfig = (owner: string, app: string, layoutSetName: string) => get<RuleConfig>(ruleConfigPath(owner, app, layoutSetName));
export const getRuleModel = (owner: string, app: string, layoutSetName: string) => get<string>(ruleHandlerPath(owner, app, layoutSetName));
export const getStarredRepos = () => get<Repository[]>(userStarredListPath());
export const getTextLanguages = (owner: string, app: string): Promise<string[]> => get(textLanguagesPath(owner, app));
export const getTextResources = (owner: string, app: string, lang: string) => get<ITextResourcesWithLanguage>(textResourcesPath(owner, app, lang));
export const getUser = () => get<User>(userCurrentPath());
export const getWidgetSettings = (owner: string, app: string) => get<WidgetSettingsResponse | null>(widgetSettingsPath(owner, app));
export const searchRepos = (filter: SearchRepoFilterParams) => get<SearchRepositoryResponse>(`${repoSearchPath()}${buildQueryParams(filter)}`);
export const validateImageFromExternalUrl = (owner: string, app: string, url: string) => get<ExternalImageUrlValidationResponse>(validateImageFromExternalUrlPath(owner, app, url));

// Settings modal
export const getAppConfig = (org: string, app: string) => get<AppConfig>(serviceConfigPath(org, app));
export const getAppPolicy = (org: string, app: string) => get<Policy>(appPolicyPath(org, app));
export const getAppMetadata = (org: string, app: string) => get<ApplicationMetadata>(appMetadataPath(org, app));

// Resourceadm
export const getAltinn2LinkServices = (org: string, environment: string) => get<Altinn2LinkService[]>(altinn2LinkServicesPath(org, environment));
export const getPolicyActions = (org: string, repo: string) => get<PolicyAction[]>(resourceActionsPath(org, repo));
export const getPolicy = (org: string, repo: string, id: string) => get<Policy>(resourcePolicyPath(org, repo, id));
export const getPolicySubjects = (org: string, repo: string) => get<PolicySubject[]>(resourceSubjectsPath(org, repo));
export const getResource = (org: string, repo: string, id: string) => get<Resource>(resourceSinglePath(org, repo, id));
export const getResourceList = (org: string) => get<ResourceListItem[]>(resourceListPath(org));
export const getResourcePublishStatus = (org: string, repo: string, id: string) => get<ResourceVersionStatus>(resourcePublishStatusPath(org, repo, id));
export const getValidatePolicy = (org: string, repo: string, id: string) => get<Validation>(resourceValidatePolicyPath(org, repo, id));
export const getValidateResource = (org: string, repo: string, id: string) => get<Validation>(resourceValidateResourcePath(org, repo, id));
export const getAccessLists = (org: string, environment: string, page?: string) => get<AccessListsResponse>(accessListsPath(org, environment, page));
export const getAccessList = (org: string, listId: string, environment: string) => get<AccessList>(accessListPath(org, listId, environment));
export const getAccessListMembers = (org: string, listId: string, environment: string, page?: string) => get<AccessListMembersResponse>(accessListMemberPath(org, listId, environment, page));
export const getResourceAccessLists = (org: string, resourceId: string, environment: string, page?: string) => get<AccessListsResponse>(resourceAccessListsPath(org, resourceId, environment, page));
export const getParties = (url: string) => get<BrregPartySearchResult>(url);
export const getSubParties = (url: string) => get<BrregSubPartySearchResult>(url);
export const getAltinn2DelegationsCount = (org: string, serviceCode: string, serviceEdition: string, env: string) => get<DelegationCountOverview>(altinn2DelegationsCountPath(org, serviceCode, serviceEdition, env));

// ProcessEditor
export const getBpmnFile = (org: string, app: string) => get<string>(processEditorPath(org, app));
export const getProcessTaskType = (org: string, app: string, taskId: string) => get<string>(`${processTaskTypePath(org, app, taskId)}`);
