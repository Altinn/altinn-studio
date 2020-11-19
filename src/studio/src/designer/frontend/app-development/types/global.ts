/* eslint-disable camelcase */
// eslint-disable-next-line import/no-cycle
import { IHandleServiceInformationState } from '../features/administration/handleServiceInformationReducer';
import { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import { IAppClusterState } from '../sharedResources/appCluster/appClusterReducer';
import { IAppDeploymentState } from '../sharedResources/appDeployment/appDeploymentReducer';
import { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataReducer';
import { IAppReleaseState } from '../sharedResources/appRelease/appReleaseReducer';
import { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';
import { IConfigurationState } from '../sharedResources/configuration/configurationReducer';
import { IRepoStatusState } from '../sharedResources/repoStatus/repoStatusReducer';
import { IDataModelingState } from '../features/dataModeling/dataModelingReducer';

declare global {
  export interface IServiceDevelopmentNameSpace<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10> {
    language: T1;
    handleMergeConflict: T2;
    serviceInformation: T3;
    applicationMetadataState: T4;
    appCluster: T5;
    repoStatus: T6;
    appReleases: T7;
    appDeployments: T8;
    configuration: T9;
    dataModeling: T10;
  }

  export interface IServiceDevelopmentState
    extends IServiceDevelopmentNameSpace
    <IFetchedLanguageState,
    IHandleMergeConflictState,
    IHandleServiceInformationState,
    IApplicationMetadataState,
    IAppClusterState,
    IRepoStatusState,
    IAppReleaseState,
    IAppDeploymentState,
    IConfigurationState,
    IDataModelingState> { }
}

export interface IRepository {
  clone_url: string;
  created_at: string;
  default_branch: string;
  description: string;
  empty: boolean;
  fork: boolean;
  forks_count: number;
  full_name: string;
  html_url: string;
  id: number;
  is_cloned_to_local: boolean;
  mirror: boolean;
  name: string;
  open_issues_count: number;
  owner: IOwner;
  permissions: IPermissions;
  private: boolean;
  repositoryCreatedStatus: number;
  size: number;
  ssh_url: string;
  stars_count: number;
  updated_at: string;
  watchers_count: number;
  website: string;
}

export interface IOwner {
  avatar_url: string;
  email: string;
  full_name: string;
  id: number;
  login: string;
  UserType: number;
}

export interface IPermissions {
  admin: boolean;
  pull: boolean;
  push: boolean;
}

export interface ICommit {
  message: string;
  author: ICommitAuthor;
  comitter: ICommitAuthor;
  sha: string;
  messageShort: string;
  encoding: string;
}

export interface ICommitAuthor {
  email: string;
  name: string;
  when: any;
}

export interface IServiceName {
  name: string;
  saving: boolean;
}

export interface IServiceDescription {
  description: string;
  saving: boolean;
}

export interface IServiceId {
  serviceId: string;
  saving: boolean;
}
