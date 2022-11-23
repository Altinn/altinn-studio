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

export enum RepositoryType {
  App = 'App',
  Datamodels = 'Datamodels',
  Unknown = 'Unknown',
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
