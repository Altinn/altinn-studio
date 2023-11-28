import { get, put } from 'app-shared/utils/networking';
import {
  altinn2LinkServicesPath,
  appLibVersionPath,
  appMetadataPath,
  appPolicyPath,
  branchStatusPath,
  datamodelMetadataPath,
  datamodelPath,
  datamodelsPath,
  datamodelsXsdPath,
  deployPermissionsPath,
  deploymentsPath,
  envConfigPath,
  formLayoutsPath,
  frontEndSettingsPath,
  instanceIdForPreviewPath,
  layoutSetsPath,
  layoutSettingsPath,
  optionListIdsPath,
  orgsListPath,
  processEditorPath,
  releasesPath,
  repoInitialCommitPath,
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
} from './paths';
import { AppDeploymentsResponse, AppReleasesResponse, DatamodelMetadataResponse, SearchRepoFilterParams, SearchRepositoryResponse } from 'app-shared/types/api';
import { BranchStatus } from 'app-shared/types/BranchStatus';
import { DatamodelMetadataJson, DatamodelMetadataXsd } from 'app-shared/types/DatamodelMetadata';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { ILayoutSettings, IRepository, ITextResourcesWithLanguage, IFrontEndSettings } from 'app-shared/types/global';
import { Organization } from 'app-shared/types/Organization';
import { OrgsState } from 'app-shared/types/OrgsState';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { Repository } from 'app-shared/types/Repository';
import { RuleConfig } from 'app-shared/types/RuleConfig';
import { User } from 'app-shared/types/User';
import { WidgetSettingsResponse } from 'app-shared/types/widgetTypes';
import { buildQueryParams } from 'app-shared/utils/urlUtils';
import { componentSchemaUrl, expressionSchemaUrl, layoutSchemaUrl, newsListUrl, numberFormatSchemaUrl, orgsListUrl } from '../cdn-paths';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { PolicyAction, Policy, PolicySubject } from '@altinn/policy-editor';
import type { Resource, ResourceListItem, ResourceVersionStatus, Validation } from 'app-shared/types/ResourceAdm';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { Commit } from 'app-shared/types/Commit';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { NewsList } from 'app-shared/types/api/NewsList';

export const getAppReleases = (owner: string, app: string) => get<AppReleasesResponse>(releasesPath(owner, app, 'Descending'));
export const getBranchStatus = (owner: string, app: string, branch: string) => get<BranchStatus>(branchStatusPath(owner, app, branch));
export const getDatamodel = (owner: string, app: string, modelPath: string) => get<JsonSchema>(datamodelPath(owner, app, modelPath));
export const getDatamodelMetadata = (owner: string, app: string) => get<DatamodelMetadataResponse>(datamodelMetadataPath(owner, app));
export const getDatamodelsJson = (owner: string, app: string) => get<DatamodelMetadataJson[]>(datamodelsPath(owner, app));
export const getDatamodelsXsd = (owner: string, app: string) => get<DatamodelMetadataXsd[]>(datamodelsXsdPath(owner, app));
export const getDeployPermissions = (owner: string, app: string) => get<string[]>(deployPermissionsPath(owner, app));
export const getDeployments = (owner: string, app: string) => get<AppDeploymentsResponse>(deploymentsPath(owner, app, 'Descending'));
export const getEnvironments = () => get<DeployEnvironment[]>(envConfigPath());
export const getFormLayoutSettings = (owner: string, app: string, layoutSetName: string) => get<ILayoutSettings>(layoutSettingsPath(owner, app, layoutSetName));
export const getFormLayouts = (owner: string, app: string, layoutSetName: string) => get<FormLayoutsResponse>(formLayoutsPath(owner, app, layoutSetName));
export const getFrontEndSettings = (owner: string, app: string) => get<IFrontEndSettings>(frontEndSettingsPath(owner, app));
export const getLayoutSets = (owner: string, app: string) => get<LayoutSets>(layoutSetsPath(owner, app));
export const getInstanceIdForPreview = (owner: string, app: string) => get<string>(instanceIdForPreviewPath(owner, app));
export const getNewsList = (language: 'nb' | 'en') => get<NewsList>(newsListUrl(language));
export const getOrgList = () => get<OrgsState>(orgsListUrl());
export const getOrganizations = () => get<Organization[]>(orgsListPath());
export const getRepoInitialCommit = (owner: string, app: string) => get<Commit>(repoInitialCommitPath(owner, app));
export const getRepoMetadata = (owner: string, app: string) => get<Repository>(repoMetaPath(owner, app));
export const getRepoPull = (owner: string, app: string) => get<RepoStatus>(repoPullPath(owner, app));
export const getRepoStatus = (owner: string, app: string) => get<RepoStatus>(repoStatusPath(owner, app));
export const getRuleConfig = (owner: string, app: string, layoutSetName: string) => get<RuleConfig>(ruleConfigPath(owner, app, layoutSetName));
export const getRuleModel = (owner: string, app: string, layoutSetName: string) => get(ruleHandlerPath(owner, app, layoutSetName));
export const getStarredRepos = () => get<IRepository[]>(userStarredListPath());
export const getTextLanguages = (owner: string, app: string): Promise<string[]> => get(textLanguagesPath(owner, app));
export const getTextResources = (owner: string, app: string, lang: string) => get<ITextResourcesWithLanguage>(textResourcesPath(owner, app, lang));
export const getUser = () => get<User>(userCurrentPath());
export const getWidgetSettings = (owner: string, app: string) => get<WidgetSettingsResponse | null>(widgetSettingsPath(owner, app));
export const searchRepos = (filter: SearchRepoFilterParams) => get<SearchRepositoryResponse>(`${repoSearchPath()}${buildQueryParams(filter)}`);
export const getOptionListIds = (owner: string, app: string) => get<string[]>(optionListIdsPath(owner, app));

export const getExpressionSchema = () => get<string[]>(expressionSchemaUrl());
export const getLayoutSchema = () => get<string[]>(layoutSchemaUrl());
export const getNumberFormatSchema = () => get<string[]>(numberFormatSchemaUrl());
export const getComponentSchema = (component: string) => get<string[]>(componentSchemaUrl(component));
export const getComponentsCommonDefsSchema = () => get<string[]>(componentSchemaUrl('common-defs'));

// Settings modal
export const getAppConfig = (org: string, app: string) => get<AppConfig>(serviceConfigPath(org, app));
export const getAppPolicy = (org: string, app: string) => get<Policy>(appPolicyPath(org, app));
export const getAppMetadata = (org: string, app: string) => get<ApplicationMetadata>(appMetadataPath(org, app));

// Resourceadm
export const getPolicyActions = (org: string, repo: string) => get<PolicyAction[]>(resourceActionsPath(org, repo));
export const getPolicy = (org: string, repo: string, id: string) => get<Policy>(resourcePolicyPath(org, repo, id));
export const getPolicySubjects = (org: string, repo: string) => get<PolicySubject[]>(resourceSubjectsPath(org, repo));
export const getResourcePublishStatus = (org: string, repo: string, id: string) => get<ResourceVersionStatus>(resourcePublishStatusPath(org, repo, id));
export const getResourceList = (org: string) => get<ResourceListItem[]>(resourceListPath(org));
export const getResource = (org: string, repo: string, id: string) => get<Resource>(resourceSinglePath(org, repo, id));
export const getValidatePolicy = (org: string, repo: string, id: string) => get<Validation>(resourceValidatePolicyPath(org, repo, id));
export const getValidateResource = (org: string, repo: string, id: string) => get<Validation>(resourceValidateResourcePath(org, repo, id));
export const getAltinn2LinkServices = (org: string, environment: string) => get<Altinn2LinkService[]>(altinn2LinkServicesPath(org, environment));

// ProcessEditor
export const getBpmnFile = (org: string, app: string) => get(processEditorPath(org, app));
export const updateBpmnXml = (org: string, app: string, bpmnXml: string) =>
  put(processEditorPath(org, app), bpmnXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
export const getAppLibVersion = (org: string, app: string) => get(appLibVersionPath(org, app));
