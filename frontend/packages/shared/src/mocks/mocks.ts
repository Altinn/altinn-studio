import type {
  AppReleasesResponse,
  CreateRepoCommitPayload,
  DataModelMetadataResponse,
  SearchRepositoryResponse,
} from 'app-shared/types/api';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { NewsList } from 'app-shared/types/api/NewsList';
import type { BranchStatus } from 'app-shared/types/BranchStatus';
import type { Commit } from 'app-shared/types/Commit';
import type { OrgList } from 'app-shared/types/OrgList';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { User, Repository } from 'app-shared/types/Repository';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { Policy } from '@altinn/policy-editor';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { Resource, ResourceVersionStatus, Validation } from 'app-shared/types/ResourceAdm';
import type { AppVersion } from 'app-shared/types/AppVersion';
import type { Build } from 'app-shared/types/Build';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { Environment } from 'app-shared/types/Environment';
import type { Organization } from 'app-shared/types/Organization';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { AppRelease } from 'app-shared/types/AppRelease';

export const build: Build = {
  id: '',
  status: BuildStatus.none,
  result: BuildResult.none,
  started: '',
  finished: '',
};

export const appReleasesResponse: AppReleasesResponse = {
  results: [],
};

export const appRelease: AppRelease = {
  id: '',
  tagName: '',
  name: '',
  body: '',
  app: '',
  org: '',
  targetCommitish: '',
  createdBy: '',
  created: '',
  build,
};

export const appVersion: AppVersion = {
  backendVersion: '',
  frontendVersion: '',
};

export const branchStatus: BranchStatus = {
  commit: {
    author: '',
    committer: '',
    id: '',
  },
  name: '',
};

export const dataModelMetadataResponse: DataModelMetadataResponse = {
  elements: {},
};

export const deploymentsResponse: DeploymentsResponse = {
  pipelineDeploymentList: [],
  kubernetesDeploymentList: [],
};

export const pipelineDeployment: PipelineDeployment = {
  id: '',
  deploymentType: 'Deploy',
  tagName: '',
  app: '',
  org: '',
  envName: '',
  createdBy: '',
  created: '',
  build,
};

export const kubernetesDeployment: KubernetesDeployment = {
  envName: '',
  release: '',
  version: '',
};

export const environment: Environment = {
  appsUrl: '',
  platformUrl: '',
  hostname: '',
  appPrefix: '',
  platformPrefix: '',
  name: '',
  type: '',
};

export const layoutSets: LayoutSets = {
  sets: [],
};

export const newsList: NewsList = {
  news: [],
};

export const orgList: OrgList = {
  orgs: {},
};

export const commit: Commit = {
  message: '',
  author: { name: '', email: '', when: new Date(null) },
  comitter: { name: '', email: '', when: new Date(null) },
  sha: '',
  messageShort: '',
  encoding: '',
};

export const repoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: '',
};

export const ruleConfig: RuleConfig = {
  data: {
    ruleConnection: {},
    conditionalRendering: {},
  },
};

export const textResourcesWithLanguage: ITextResourcesWithLanguage = {
  language: '',
  resources: [],
};

export const user: User = {
  avatar_url: '',
  email: '',
  full_name: '',
  id: 1,
  login: '',
  userType: 0,
};

export const appConfig: AppConfig = {
  repositoryName: '',
  serviceName: {
    nb: '',
    nn: '',
    en: '',
  },
  serviceId: '',
  serviceDescription: '',
};

export const policy: Policy = {
  rules: [],
  requiredAuthenticationLevelEndUser: '0',
  requiredAuthenticationLevelOrg: '',
};

export const applicationMetadata: ApplicationMetadata = {
  id: '',
  org: '',
};

export const resourceVersionStatus: ResourceVersionStatus = {
  publishedVersions: [],
};

export const validation: Validation = {
  status: 200,
  errors: [],
};

export const repository: Repository = {
  clone_url: '',
  created_at: '',
  default_branch: '',
  description: '',
  empty: false,
  fork: false,
  forks_count: 0,
  full_name: '',
  html_url: '',
  id: 1,
  is_cloned_to_local: false,
  mirror: false,
  name: '',
  open_issues_count: 0,
  owner: {
    avatar_url: '',
    email: '',
    full_name: '',
    id: 1,
    login: '',
    userType: 0,
  },
  permissions: {
    admin: false,
    pull: false,
    push: false,
  },
  private: false,
  repositoryCreatedStatus: 0,
  size: 0,
  ssh_url: '',
  stars_count: 0,
  updated_at: '',
  watchers_count: 0,
  website: '',
};

export const createRepoCommitPayload: CreateRepoCommitPayload = {
  message: '',
  org: '',
  repository: '',
};

export const organization: Organization = {
  avatar_url: '',
  id: 1,
  username: '',
};

export const resource: Resource = {
  identifier: '',
  title: {
    nb: '',
    nn: '',
    en: '',
  },
};

export const searchRepositoryResponse: SearchRepositoryResponse = {
  data: [],
  ok: false,
  totalCount: 0,
  totalPages: 0,
};
