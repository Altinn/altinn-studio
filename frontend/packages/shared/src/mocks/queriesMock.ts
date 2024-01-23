import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { AppLibVersion } from 'app-shared/types/AppLibVersion';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import type { Commit } from 'app-shared/types/Commit';
import type {
  DatamodelMetadataJson,
  DatamodelMetadataXsd,
} from 'app-shared/types/DatamodelMetadata';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { Organization } from 'app-shared/types/Organization';
import type { OrgsState } from 'app-shared/types/OrgsState';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import type { Repository } from 'app-shared/types/Repository';
import type {
  AccessList,
  AccessListResourceLink,
  BrregPartySearchResult,
  BrregSubPartySearchResult,
  Resource,
  ResourceListItem,
  ResourceVersionStatus,
  Validation,
} from 'app-shared/types/ResourceAdm';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import type { User } from 'app-shared/types/Repository';
import type {
  AppDeploymentsResponse,
  AppReleasesResponse,
  CreateRepoCommitPayload,
  DatamodelMetadataResponse,
  FormLayoutsResponse,
  SearchRepositoryResponse,
} from 'app-shared/types/api';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { NewsList } from 'app-shared/types/api/NewsList';
import type {
  IFrontEndSettings,
  ILayoutSettings,
  ITextResourcesObjectFormat,
  ITextResourcesWithLanguage,
} from 'app-shared/types/global';
import type { WidgetSettingsResponse } from 'app-shared/types/widgetTypes';
import type { Policy, PolicyAction, PolicySubject } from 'packages/policy-editor';
import {
  appConfig,
  appDeploymentsResponse,
  appLibVersion,
  appReleasesResponse,
  appVersionResponse,
  applicationMetadata,
  branchStatus,
  commit,
  createRepoCommitPayload,
  datamodelMetadataResponse,
  layoutSets,
  newsList,
  orgsState,
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
import { AppVersionResponse } from 'app-shared/types/api/AppVersionReponse';

export const queriesMock: ServicesContextProps = {
  // Queries
  getAppReleases: jest
    .fn()
    .mockImplementation(() => Promise.resolve<AppReleasesResponse>(appReleasesResponse)),
  getAppVersion: jest
    .fn()
    .mockImplementation(() => Promise.resolve<AppVersionResponse>(appVersionResponse)),
  getBranchStatus: jest.fn().mockImplementation(() => Promise.resolve<BranchStatus>(branchStatus)),
  getComponentSchema: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getComponentsCommonDefsSchema: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getDatamodel: jest.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  getDatamodelMetadata: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve<DatamodelMetadataResponse>(datamodelMetadataResponse),
    ),
  getDatamodelsJson: jest
    .fn()
    .mockImplementation(() => Promise.resolve<DatamodelMetadataJson[]>([])),
  getDatamodelsXsd: jest.fn().mockImplementation(() => Promise.resolve<DatamodelMetadataXsd[]>([])),
  getDeployPermissions: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getDeployments: jest
    .fn()
    .mockImplementation(() => Promise.resolve<AppDeploymentsResponse>(appDeploymentsResponse)),
  getEnvironments: jest.fn().mockImplementation(() => Promise.resolve<DeployEnvironment[]>([])),
  getExpressionSchema: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getFormLayoutSettings: jest.fn().mockImplementation(() => Promise.resolve<ILayoutSettings>({})),
  getFormLayouts: jest.fn().mockImplementation(() => Promise.resolve<FormLayoutsResponse>({})),
  getFrontEndSettings: jest.fn().mockImplementation(() => Promise.resolve<IFrontEndSettings>({})),
  getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve<string>('')),
  getLayoutSchema: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve<LayoutSets>(layoutSets)),
  getNewsList: jest.fn().mockImplementation(() => Promise.resolve<NewsList>(newsList)),
  getNumberFormatSchema: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getOrgList: jest.fn().mockImplementation(() => Promise.resolve<OrgsState>(orgsState)),
  getOrganizations: jest.fn().mockImplementation(() => Promise.resolve<Organization[]>([])),
  getRepoInitialCommit: jest.fn().mockImplementation(() => Promise.resolve<Commit>(commit)),
  getRepoMetadata: jest.fn().mockImplementation(() => Promise.resolve<Repository>(repository)),
  getRepoPull: jest.fn().mockImplementation(() => Promise.resolve<RepoStatus>(repoStatus)),
  getRepoStatus: jest.fn().mockImplementation(() => Promise.resolve<RepoStatus>(repoStatus)),
  getRuleConfig: jest.fn().mockImplementation(() => Promise.resolve<RuleConfig>(ruleConfig)),
  getRuleModel: jest.fn().mockImplementation(() => Promise.resolve<string>('')),
  getStarredRepos: jest.fn().mockImplementation(() => Promise.resolve<Repository[]>([])),
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
  getTextResources: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve<ITextResourcesWithLanguage>(textResourcesWithLanguage),
    ),
  getUser: jest.fn().mockImplementation(() => Promise.resolve<User>(user)),
  getWidgetSettings: jest
    .fn()
    .mockImplementation(() => Promise.resolve<WidgetSettingsResponse | null>({})),
  searchRepos: jest
    .fn()
    .mockImplementation(() => Promise.resolve<SearchRepositoryResponse>(searchRepositoryResponse)),

  // Queries - Settings modal
  getAppConfig: jest.fn().mockImplementation(() => Promise.resolve<AppConfig>(appConfig)),
  getAppPolicy: jest.fn().mockImplementation(() => Promise.resolve<Policy>(policy)),
  getAppMetadata: jest
    .fn()
    .mockImplementation(() => Promise.resolve<ApplicationMetadata>(applicationMetadata)),

  // Queries - Resourceadm
  getAltinn2LinkServices: jest
    .fn()
    .mockImplementation(() => Promise.resolve<Altinn2LinkService[]>([])),
  getPolicyActions: jest.fn().mockImplementation(() => Promise.resolve<PolicyAction[]>([])),
  getPolicy: jest.fn().mockImplementation(() => Promise.resolve<Policy>(policy)),
  getPolicySubjects: jest.fn().mockImplementation(() => Promise.resolve<PolicySubject[]>([])),
  getResource: jest.fn().mockImplementation(() => Promise.resolve<Resource>(resource)),
  getResourceList: jest.fn().mockImplementation(() => Promise.resolve<ResourceListItem[]>([])),
  getResourcePublishStatus: jest
    .fn()
    .mockImplementation(() => Promise.resolve<ResourceVersionStatus>(resourceVersionStatus)),
  getValidatePolicy: jest.fn().mockImplementation(() => Promise.resolve<Validation>(validation)),
  getValidateResource: jest.fn().mockImplementation(() => Promise.resolve<Validation>(validation)),
  getAccessLists: jest.fn().mockImplementation(() => Promise.resolve<AccessList[]>([])),
  getAccessList: jest.fn().mockImplementation(() => Promise.resolve<AccessList>(null)),
  getResourceAccessLists: jest
    .fn()
    .mockImplementation(() => Promise.resolve<AccessListResourceLink[]>([])),
  getParties: jest.fn().mockImplementation(() => Promise.resolve<BrregPartySearchResult>(null)),
  getSubParties: jest
    .fn()
    .mockImplementation(() => Promise.resolve<BrregSubPartySearchResult>(null)),

  // Queries - PrgetBpmnFile
  getAppLibVersion: jest
    .fn()
    .mockImplementation(() => Promise.resolve<AppLibVersion>(appLibVersion)),
  getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve<string>('')),

  // Mutations
  addAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve()),
  addLanguageCode: jest.fn().mockImplementation(() => Promise.resolve()),
  addLayoutSet: jest.fn().mockImplementation(() => Promise.resolve()),
  addRepo: jest.fn().mockImplementation(() => Promise.resolve<Repository>(repository)),
  addXsdFromRepo: jest.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  commitAndPushChanges: jest
    .fn()
    .mockImplementation(() => Promise.resolve<CreateRepoCommitPayload>(createRepoCommitPayload)),
  configureLayoutSet: jest.fn().mockImplementation(() => Promise.resolve<LayoutSets>(layoutSets)),
  copyApp: jest.fn().mockImplementation(() => Promise.resolve()),
  createDatamodel: jest.fn().mockImplementation(() => Promise.resolve<JsonSchema>({})),
  createDeployment: jest.fn().mockImplementation(() => Promise.resolve()),
  createRelease: jest.fn().mockImplementation(() => Promise.resolve()),
  createRepoCommit: jest
    .fn()
    .mockImplementation(() => Promise.resolve<CreateRepoCommitPayload>(createRepoCommitPayload)),
  deleteAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve()),
  deleteDatamodel: jest.fn().mockImplementation(() => Promise.resolve()),
  deleteFormLayout: jest.fn().mockImplementation(() => Promise.resolve()),
  deleteLanguageCode: jest.fn().mockImplementation(() => Promise.resolve()),
  generateModels: jest.fn().mockImplementation(() => Promise.resolve()),
  logout: jest.fn().mockImplementation(() => Promise.resolve()),
  pushRepoChanges: jest.fn().mockImplementation(() => Promise.resolve()),
  resetRepoChanges: jest.fn().mockImplementation(() => Promise.resolve()),
  saveDatamodel: jest.fn().mockImplementation(() => Promise.resolve()),
  saveFormLayout: jest.fn().mockImplementation(() => Promise.resolve()),
  saveFormLayoutSettings: jest.fn().mockImplementation(() => Promise.resolve<ILayoutSettings>({})),
  saveRuleConfig: jest.fn().mockImplementation(() => Promise.resolve<RuleConfig>(ruleConfig)),
  setStarredRepo: jest.fn().mockImplementation(() => Promise.resolve()),
  unsetStarredRepo: jest.fn().mockImplementation(() => Promise.resolve()),
  updateAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve()),
  updateFormLayoutName: jest.fn().mockImplementation(() => Promise.resolve()),
  updateTextId: jest.fn().mockImplementation(() => Promise.resolve()),
  updateTranslationByLangCode: jest.fn().mockImplementation(() => Promise.resolve()),
  updateAppPolicy: jest.fn().mockImplementation(() => Promise.resolve()),
  updateAppMetadata: jest.fn().mockImplementation(() => Promise.resolve()),
  updateAppConfig: jest.fn().mockImplementation(() => Promise.resolve()),
  upsertTextResources: jest
    .fn()
    .mockImplementation(() => Promise.resolve<ITextResourcesObjectFormat>({})),

  // Mutations - Resourceadm
  createResource: jest.fn().mockImplementation(() => Promise.resolve()),
  importResourceFromAltinn2: jest.fn().mockImplementation(() => Promise.resolve<Resource>(null)),
  publishResource: jest.fn().mockImplementation(() => Promise.resolve()),
  updatePolicy: jest.fn().mockImplementation(() => Promise.resolve()),
  updateResource: jest.fn().mockImplementation(() => Promise.resolve()),
  createAccessList: jest.fn().mockImplementation(() => Promise.resolve()),
  updateAccessList: jest.fn().mockImplementation(() => Promise.resolve()),
  deleteAccessList: jest.fn().mockImplementation(() => Promise.resolve()),
  addAccessListMember: jest.fn().mockImplementation(() => Promise.resolve()),
  removeAccessListMember: jest.fn().mockImplementation(() => Promise.resolve()),
  addResourceAccessList: jest.fn().mockImplementation(() => Promise.resolve()),
  removeResourceAccessList: jest.fn().mockImplementation(() => Promise.resolve()),

  // Mutations - ProcessEditor
  updateBpmnXml: jest.fn().mockImplementation(() => Promise.resolve()),
};
