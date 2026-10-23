/* istanbul ignore file */

import { vi } from 'vitest';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { AppVersion } from 'app-shared/types/AppVersion';
import type { AppUpgradeRun, AppUpgradeStart, AppUpgradeStatus } from 'app-shared/types/AppUpgrade';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import type { Branch, CurrentBranchInfo } from 'app-shared/types/api/BranchTypes';
import type {
  DataModelMetadataJson,
  DataModelMetadataXsd,
} from 'app-shared/types/DataModelMetadata';
import type { Environment } from 'app-shared/types/Environment';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import type { Organization } from 'app-shared/types/Organization';
import type { OrgList } from 'app-shared/types/OrgList';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import type { Repository, User } from 'app-shared/types/Repository';
import type {
  AccessList,
  AccessListsResponse,
  BrregPartySearchResult,
  BrregSubPartySearchResult,
  Resource,
  ResourceListItem,
  ResourceVersionStatus,
  Validation,
} from 'app-shared/types/ResourceAdm';
import type { RuleConfig } from 'app-shared/types/RuleConfig';

import type {
  AppReleasesResponse,
  CreateRepoCommitPayload,
  DataModelMetadataResponse,
  FormLayoutsResponse,
  SearchRepositoryResponse,
} from 'app-shared/types/api';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import {
  type IFrontEndSettings,
  type ILayoutSettings,
  type IValidationOnNavigationLayoutSettings,
  type IValidationOnNavigationPageSettings,
  type ITextResourcesWithLanguage,
  ValidationOnNavigationLevel,
} from 'app-shared/types/global';
import type { WidgetSettingsResponse } from 'app-shared/types/widgetTypes';
import type { UserApiKey } from 'app-shared/types/api/UserApiKey';
import type {
  StudioctlAuthCallback,
  StudioctlAuthRequest,
} from 'app-shared/types/api/StudioctlAuth';
import type { Policy, PolicyAction, PolicySubject } from 'packages/policy-editor';
import {
  appConfig,
  deploymentsResponse,
  appVersion,
  appUpgradeRun,
  appUpgradeStart,
  appUpgradeStatus,
  appReleasesResponse,
  applicationMetadata,
  branchStatus,
  createRepoCommitPayload,
  dataModelMetadataResponse,
  layoutSets,
  orgList,
  policy,
  repoStatus,
  repository,
  resource,
  resourceVersionStatus,
  ruleConfig,
  searchRepositoryResponse,
  textResourcesWithLanguage,
  user,
  validation,
} from './mocks';
import type { FormLayoutsResponseV3 } from 'app-shared/types/api/FormLayoutsResponseV3';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { RepoDiffResponse } from 'app-shared/types/api/RepoDiffResponse';
import type { ExternalImageUrlValidationResponse } from 'app-shared/types/api/ExternalImageUrlValidationResponse';
import type { OptionList } from 'app-shared/types/OptionList';
import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import type { LayoutSetModel } from '../types/api/dto/LayoutSetModel';
import { layoutSetsExtendedMock } from '@altinn/ux-editor-v4/testing/layoutSetsMock';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';
import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { emptyTextResourceListMock } from 'app-shared/mocks/emptyTextResourceListMock';
import type { CanUseFeature } from 'app-shared/types/api/CanUseFeatureResponse';
import type { SharedResourcesResponse } from 'app-shared/types/api/SharedResourcesResponse';
import type { CustomTemplateList } from 'app-shared/types/CustomTemplate';
import type { AppTemplate } from 'app-shared/types/AppTemplate';
import type { AppSettings } from 'app-shared/types/AppSettings';

export const queriesMock: ServicesContextProps = {
  // Queries
  getAppMetadataModelIds: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getAppValidation: vi.fn().mockImplementation(() => Promise.resolve<any>({})),
  getAppReleases: vi
    .fn()
    .mockImplementation(() => Promise.resolve<AppReleasesResponse>(appReleasesResponse)),
  getAppVersion: vi.fn().mockImplementation(() => Promise.resolve<AppVersion>(appVersion)),
  getAppUpgradeStatus: vi
    .fn()
    .mockImplementation(() => Promise.resolve<AppUpgradeStatus>(appUpgradeStatus)),
  getAppUpgradeRun: vi.fn().mockImplementation(() => Promise.resolve<AppUpgradeRun>(appUpgradeRun)),
  getAvailableResourcesFromOrg: vi
    .fn()
    .mockImplementation(() => Promise.resolve<ExternalResource[]>([])),
  getAppTemplates: vi.fn().mockImplementation(() => Promise.resolve<AppTemplate[]>([])),
  getAvailableTemplates: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<CustomTemplateList>({ templates: [], totalCount: 0 }),
    ),
  getBranchStatus: vi.fn().mockImplementation(() => Promise.resolve<BranchStatus>(branchStatus)),
  getBranches: vi.fn().mockImplementation(() => Promise.resolve<Branch[]>([])),
  getCurrentBranch: vi.fn().mockImplementation(() =>
    Promise.resolve<CurrentBranchInfo>({
      branchName: 'master',
      commitSha: 'abc123',
      isTracking: true,
      remoteName: 'origin',
    }),
  ),
  getDataModel: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  getDataModelMetadata: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<DataModelMetadataResponse>(dataModelMetadataResponse),
    ),
  getDataModelsJson: vi.fn().mockImplementation(() => Promise.resolve<DataModelMetadataJson[]>([])),
  getDataModelPrefill: vi.fn().mockImplementation(() => Promise.resolve<PrefillConfig>(null)),
  getDataModelsXsd: vi.fn().mockImplementation(() => Promise.resolve<DataModelMetadataXsd[]>([])),
  getDataModelGenerationStatus: vi.fn().mockImplementation(() => Promise.resolve<boolean>(false)),
  getDataType: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  getDeployPermissions: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getDeployments: vi
    .fn()
    .mockImplementation(() => Promise.resolve<DeploymentsResponse>(deploymentsResponse)),
  getRepoDiff: vi.fn().mockImplementation(() => Promise.resolve<RepoDiffResponse>({})),
  getEnvironments: vi.fn().mockImplementation(() => Promise.resolve<Environment[]>([])),
  getFormLayoutSettings: vi.fn().mockImplementation(() => Promise.resolve<ILayoutSettings>({})),
  getValidationOnNavigationLayoutSettings: vi
    .fn()
    .mockImplementation(() => Promise.resolve<IValidationOnNavigationLayoutSettings[]>([])),
  getValidationOnNavigationPageSettings: vi
    .fn()
    .mockImplementation(() => Promise.resolve<IValidationOnNavigationPageSettings[]>([])),
  getFormLayouts: vi.fn().mockImplementation(() => Promise.resolve<FormLayoutsResponse>({})),
  getFormLayoutsV3: vi.fn().mockImplementation(() => Promise.resolve<FormLayoutsResponseV3>({})),
  getFrontEndSettings: vi.fn().mockImplementation(() => Promise.resolve<IFrontEndSettings>({})),
  getImageFileNames: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getLayoutNames: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getLayoutSets: vi.fn().mockImplementation(() => Promise.resolve<LayoutSets>(layoutSets)),
  getLayoutSetsExtendedV4: vi
    .fn()
    .mockImplementation(() => Promise.resolve<LayoutSetModel[]>(layoutSetsExtendedMock)),
  getLayoutSetsExtended: vi
    .fn()
    .mockImplementation(() => Promise.resolve<LayoutSetModel[]>(layoutSetsExtendedMock)),
  getValidationOnNavigationLayoutSets: vi
    .fn()
    .mockImplementation(() => Promise.resolve({ show: [], page: '' })),
  getValidationOnNavigation: vi
    .fn()
    .mockImplementation((_org, _app, level = ValidationOnNavigationLevel.Global) => {
      switch (level) {
        case ValidationOnNavigationLevel.LayoutSets:
        case ValidationOnNavigationLevel.Pages:
          return Promise.resolve([]);
        case ValidationOnNavigationLevel.Global:
        default:
          return Promise.resolve({ show: [], page: '' });
      }
    }),
  getOptionListIds: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getOptionList: vi.fn().mockImplementation(() => Promise.resolve<OptionList>([])),
  getOptionLists: vi.fn().mockImplementation(() => Promise.resolve<OptionListsResponse>([])),
  getOptionListsReferences: vi
    .fn()
    .mockImplementation(() => Promise.resolve<OptionListReferences>([])),
  getOrganizations: vi.fn().mockImplementation(() => Promise.resolve<Organization[]>([])),
  getOrgCodeLists: vi.fn().mockImplementation(() => Promise.resolve<CodeListsResponse>([])),
  getOrgList: vi.fn().mockImplementation(() => Promise.resolve<OrgList>(orgList)),
  getOrgTextLanguages: vi.fn().mockImplementation(() => Promise.resolve<string[] | null>([])),
  getOrgTextResources: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<ITextResourcesWithLanguage>(textResourcesWithLanguage),
    ),
  getSharedResources: vi.fn().mockImplementation(() =>
    Promise.resolve<SharedResourcesResponse>({
      files: [],
      commitSha: '',
    }),
  ),
  getPublishedResources: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getRepoMetadata: vi.fn().mockImplementation(() => Promise.resolve<Repository>(repository)),
  getRepoPull: vi.fn().mockImplementation(() => Promise.resolve<RepoStatus>(repoStatus)),
  getRepoStatus: vi.fn().mockImplementation(() => Promise.resolve<RepoStatus>(repoStatus)),
  getRuleConfig: vi.fn().mockImplementation(() => Promise.resolve<RuleConfig>(ruleConfig)),
  getRuleModel: vi.fn().mockImplementation(() => Promise.resolve<string>('')),
  getStarredRepos: vi.fn().mockImplementation(() => Promise.resolve<Repository[]>([])),
  getSubformComponents: vi.fn().mockImplementation(() => Promise.resolve<SubformComponent[]>([])),
  getTaskNavigationGroupV4: vi.fn().mockImplementation(() => Promise.resolve([])),
  getTaskNavigationGroup: vi.fn().mockImplementation(() => Promise.resolve([])),
  getTextLanguages: vi.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getTextResources: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<ITextResourcesWithLanguage>(textResourcesWithLanguage),
    ),
  getUser: vi.fn().mockImplementation(() => Promise.resolve<User>(user)),
  getStudioctlAuthRequest: vi.fn().mockImplementation(() =>
    Promise.resolve<StudioctlAuthRequest>({
      username: user.login,
      clientName: 'studioctl dev',
      tokenName: 'studioctl dev mock',
      expiresAt: '2099-01-01T00:00:00Z',
    }),
  ),
  getWidgetSettings: vi
    .fn()
    .mockImplementation(() => Promise.resolve<WidgetSettingsResponse | null>({})),
  searchRepos: vi
    .fn()
    .mockImplementation(() => Promise.resolve<SearchRepositoryResponse>(searchRepositoryResponse)),
  validateImageFromExternalUrl: vi
    .fn()
    .mockImplementation(() => Promise.resolve<ExternalImageUrlValidationResponse>('Ok')),
  getUserOrgPermissions: vi.fn().mockImplementation(() =>
    Promise.resolve({
      canCreateOrgRepo: true,
    }),
  ),
  getPages: vi.fn().mockImplementation(() => Promise.resolve([])),
  canUseFeature: vi
    .fn()
    .mockImplementation(() => Promise.resolve<CanUseFeature>({ canUseFeature: false })),

  // Queries - Settings modal
  getAppConfig: vi.fn().mockImplementation(() => Promise.resolve<AppConfig>(appConfig)),
  getAppPolicy: vi.fn().mockImplementation(() => Promise.resolve<Policy>(policy)),
  getAppMetadata: vi
    .fn()
    .mockImplementation(() => Promise.resolve<ApplicationMetadata>(applicationMetadata)),

  // Queries - Resourceadm
  getAltinn2ResourcePolicies: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<{ identifier?: string; policy?: Policy; resourceType: string }[]>([]),
    ),
  getPolicyActions: vi.fn().mockImplementation(() => Promise.resolve<PolicyAction[]>([])),
  getPolicy: vi.fn().mockImplementation(() => Promise.resolve<Policy>(policy)),
  getPolicySubjects: vi.fn().mockImplementation(() => Promise.resolve<PolicySubject[]>([])),
  getAccessPackages: vi.fn().mockImplementation(() => Promise.resolve([])),
  getAccessPackageServices: vi.fn().mockImplementation(() => Promise.resolve([])),
  getResource: vi.fn().mockImplementation(() => Promise.resolve<Resource>(resource)),
  getResourceList: vi.fn().mockImplementation(() => Promise.resolve<ResourceListItem[]>([])),
  getResourcePublishStatus: vi
    .fn()
    .mockImplementation(() => Promise.resolve<ResourceVersionStatus>(resourceVersionStatus)),
  getValidatePolicy: vi.fn().mockImplementation(() => Promise.resolve<Validation>(validation)),
  getValidateResource: vi.fn().mockImplementation(() => Promise.resolve<Validation>(validation)),
  getAccessLists: vi
    .fn()
    .mockImplementation(() => Promise.resolve<AccessListsResponse>({ data: [] })),
  getAllAccessLists: vi.fn().mockImplementation(() => Promise.resolve<AccessList[]>([])),
  getAccessList: vi.fn().mockImplementation(() => Promise.resolve<AccessList>(null)),
  getResourceAccessLists: vi
    .fn()
    .mockImplementation(() => Promise.resolve<AccessListsResponse>({ data: [] })),
  getParties: vi.fn().mockImplementation(() => Promise.resolve<BrregPartySearchResult>(null)),
  getSubParties: vi.fn().mockImplementation(() => Promise.resolve<BrregSubPartySearchResult>(null)),
  getAccessListMembers: vi.fn().mockImplementation(() => Promise.resolve({ data: [] })),

  // Queries - PrgetBpmnFile
  getBpmnFile: vi.fn().mockImplementation(() => Promise.resolve<string>('')),
  getProcessTaskType: vi.fn().mockImplementation(() => Promise.resolve<string>('')),
  getMaskinportenScopes: vi.fn().mockImplementation(() => Promise.resolve({ scopes: [] })),
  getSelectedMaskinportenScopes: vi.fn().mockImplementation(() => Promise.resolve({ scopes: [] })),
  getAppSettings: vi
    .fn()
    .mockImplementation(() => Promise.resolve<AppSettings>({ undeployOnInactivity: false })),
  updateSelectedMaskinportenScopes: vi.fn().mockImplementation(() => Promise.resolve()),
  updateAppSettings: vi.fn().mockImplementation(() => Promise.resolve()),
  getConsentTemplates: vi.fn().mockImplementation(() => Promise.resolve([])),

  // Queries - Contact
  fetchBelongsToGiteaOrg: vi.fn().mockImplementation(() => Promise.resolve({ belongsToOrg: true })),

  // Queries - Assistant chat
  getChatThreads: vi.fn().mockImplementation(() => Promise.resolve([])),
  getChatMessages: vi.fn().mockImplementation(() => Promise.resolve([])),

  // Queries - User settings
  getUserApiKeys: vi.fn().mockImplementation(() => Promise.resolve<UserApiKey[]>([])),
  confirmStudioctlAuthRequest: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<StudioctlAuthCallback>({ callbackUrl: 'http://127.0.0.1/callback' }),
    ),
  cancelStudioctlAuthRequest: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve<StudioctlAuthCallback>({ callbackUrl: 'http://127.0.0.1/callback' }),
    ),

  // Queries - Org settings - Contact points
  getContactPoints: vi.fn().mockImplementation(() => Promise.resolve([])),

  // Queries - Org settings - Bot accounts
  getBotAccounts: vi.fn().mockImplementation(() => Promise.resolve([])),
  getBotAccountApiKeys: vi.fn().mockImplementation(() => Promise.resolve([])),

  // Mutations
  addAppAttachmentMetadata: vi.fn().mockImplementation(() => Promise.resolve()),
  addDataTypeToAppMetadata: vi.fn().mockImplementation(() => Promise.resolve()),
  addImage: vi.fn().mockImplementation(() => Promise.resolve()),
  addLayoutSet: vi.fn().mockImplementation(() => Promise.resolve()),
  addLanguageCode: vi.fn().mockImplementation(() => Promise.resolve()),
  addRepo: vi.fn().mockImplementation(() => Promise.resolve<Repository>(repository)),
  addXsdFromRepo: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  checkoutBranch: vi.fn().mockImplementation(() => Promise.resolve({})),
  commitAndPushChanges: vi
    .fn()
    .mockImplementation(() => Promise.resolve<CreateRepoCommitPayload>(createRepoCommitPayload)),
  copyApp: vi.fn().mockImplementation(() => Promise.resolve()),
  startAppUpgrade: vi
    .fn()
    .mockImplementation(() => Promise.resolve<AppUpgradeStart>(appUpgradeStart)),
  createBranch: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteBranch: vi.fn().mockImplementation(() => Promise.resolve()),
  createDataModel: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  createDeployment: vi.fn().mockImplementation(() => Promise.resolve()),
  createOrgCodeList: vi.fn().mockImplementation(() => Promise.resolve()),
  createOrgTextResources: vi.fn().mockImplementation(() => Promise.resolve()),
  createRelease: vi.fn().mockImplementation(() => Promise.resolve()),
  createRepoCommit: vi
    .fn()
    .mockImplementation(() => Promise.resolve<CreateRepoCommitPayload>(createRepoCommitPayload)),
  deleteAppAttachmentMetadata: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteDataModel: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteDataTypeFromAppMetadata: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteFormLayout: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteImage: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteLanguageCode: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteLayoutSet: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteOptionList: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteOrgCodeList: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteValidationOnNavigationLayoutSets: vi.fn().mockImplementation(() => Promise.resolve()),
  discardChanges: vi.fn().mockImplementation(() => Promise.resolve()),
  generateModels: vi.fn().mockImplementation(() => Promise.resolve()),
  importCodeListFromOrgToApp: vi.fn().mockImplementation(() => Promise.resolve<OptionList>([])),
  publishCodeList: vi.fn().mockImplementation(() => Promise.resolve()),
  pushRepoChanges: vi.fn().mockImplementation(() => Promise.resolve()),
  resetRepoChanges: vi.fn().mockImplementation(() => Promise.resolve()),
  saveDataModel: vi.fn().mockImplementation(() => Promise.resolve()),
  saveDataModelPrefill: vi.fn().mockImplementation(() => Promise.resolve()),
  saveFormLayout: vi.fn().mockImplementation(() => Promise.resolve()),
  saveFormLayoutV3: vi.fn().mockImplementation(() => Promise.resolve()),
  saveFormLayoutSettings: vi.fn().mockImplementation(() => Promise.resolve<ILayoutSettings>({})),
  saveRuleConfig: vi.fn().mockImplementation(() => Promise.resolve<RuleConfig>(ruleConfig)),
  saveSubformPdfComponent: vi
    .fn()
    .mockImplementation(() => Promise.resolve<SubformComponent[]>([])),
  setStarredRepo: vi.fn().mockImplementation(() => Promise.resolve()),
  updateTaskNavigationGroupV4: vi.fn().mockImplementation(() => Promise.resolve()),
  updateTaskNavigationGroup: vi.fn().mockImplementation(() => Promise.resolve()),
  updateValidationOnNavigationLayoutSettings: vi.fn().mockImplementation(() => Promise.resolve()),
  updateValidationOnNavigationPageSettings: vi.fn().mockImplementation(() => Promise.resolve()),
  unsetStarredRepo: vi.fn().mockImplementation(() => Promise.resolve()),
  updateAppAttachmentMetadata: vi.fn().mockImplementation(() => Promise.resolve()),
  updateDataType: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  updateFormLayoutName: vi.fn().mockImplementation(() => Promise.resolve()),
  updateLayoutSetId: vi.fn().mockImplementation(() => Promise.resolve()),
  updateTextId: vi.fn().mockImplementation(() => Promise.resolve()),
  updateTranslationByLangCode: vi.fn().mockImplementation(() => Promise.resolve()),
  updateAppPolicy: vi.fn().mockImplementation(() => Promise.resolve()),
  updateAppMetadata: vi.fn().mockImplementation(() => Promise.resolve()),
  updateAppConfig: vi.fn().mockImplementation(() => Promise.resolve()),
  updateValidationOnNavigationLayoutSets: vi.fn().mockImplementation(() => Promise.resolve()),
  updateValidationOnNavigation: vi.fn().mockImplementation(() => Promise.resolve()),
  updateOptionList: vi.fn().mockImplementation(() => Promise.resolve()),
  updateOptionListId: vi.fn().mockImplementation(() => Promise.resolve()),
  updateOrgCodeListId: vi.fn().mockImplementation(() => Promise.resolve()),
  updateOrgCodeList: vi.fn().mockImplementation(() => Promise.resolve()),
  updateOrgTextResources: vi.fn().mockImplementation(() => Promise.resolve()),
  updateSharedResources: vi.fn().mockImplementation(() => Promise.resolve()),
  uploadOrgCodeList: vi.fn().mockImplementation(() => Promise.resolve()),
  uploadDataModel: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  replaceDataModelXsd: vi.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  uploadOptionList: vi.fn().mockImplementation(() => Promise.resolve()),
  upsertTextResources: vi.fn().mockImplementation(async (_org, _app, language) => {
    return Promise.resolve<ITextResourcesWithLanguage>(emptyTextResourceListMock(language));
  }),
  undeployAppFromEnv: vi.fn().mockImplementation(() => Promise.resolve()),
  deletePage: vi.fn().mockImplementation(() => Promise.resolve()),
  modifyPage: vi.fn().mockImplementation(() => Promise.resolve()),
  createPage: vi.fn().mockImplementation(() => Promise.resolve()),
  changePageOrder: vi.fn().mockImplementation(() => Promise.resolve()),
  changePageGroups: vi.fn().mockImplementation(() => Promise.resolve()),
  convertToPageGroups: vi.fn().mockImplementation(() => Promise.resolve()),
  convertToPageOrder: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - Resourceadm
  publishResourcePolicy: vi.fn().mockImplementation(() => Promise.resolve()),
  createResource: vi.fn().mockImplementation(() => Promise.resolve()),
  importResourceFromAltinn3: vi.fn().mockImplementation(() => Promise.resolve({})),
  publishResource: vi.fn().mockImplementation(() => Promise.resolve()),
  updatePolicy: vi.fn().mockImplementation(() => Promise.resolve()),
  updateResource: vi.fn().mockImplementation(() => Promise.resolve()),
  createAccessList: vi.fn().mockImplementation(() => Promise.resolve()),
  updateAccessList: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteAccessList: vi.fn().mockImplementation(() => Promise.resolve()),
  addAccessListMember: vi.fn().mockImplementation(() => Promise.resolve()),
  removeAccessListMember: vi.fn().mockImplementation(() => Promise.resolve()),
  addResourceAccessList: vi.fn().mockImplementation(() => Promise.resolve()),
  removeResourceAccessList: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - Preview
  createPreviewInstance: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - ProcessEditor
  updateBpmnXml: vi.fn().mockImplementation(() => Promise.resolve()),
  updateProcessDataTypes: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - User settings
  addUserApiKey: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteUserApiKey: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - Assistant chat
  createChatThread: vi.fn().mockImplementation(() => Promise.resolve()),
  updateChatThread: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteChatThread: vi.fn().mockImplementation(() => Promise.resolve()),
  createChatMessage: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteChatMessage: vi.fn().mockImplementation(() => Promise.resolve()),
  sendChatFeedback: vi.fn().mockImplementation(() => Promise.resolve()),
  clearChatFeedback: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - Org settings - Contact points
  addContactPoint: vi.fn().mockImplementation(() => Promise.resolve()),
  updateContactPoint: vi.fn().mockImplementation(() => Promise.resolve()),
  toggleContactPointActive: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteContactPoint: vi.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - Org settings - Bot accounts
  createBotAccount: vi.fn().mockImplementation(() => Promise.resolve({})),
  deactivateBotAccount: vi.fn().mockImplementation(() => Promise.resolve()),
  createBotAccountApiKey: vi.fn().mockImplementation(() => Promise.resolve({})),
  revokeBotAccountApiKey: vi.fn().mockImplementation(() => Promise.resolve()),
  updateBotAccount: vi.fn().mockImplementation(() => Promise.resolve()),
};
