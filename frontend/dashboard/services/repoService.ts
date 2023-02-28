import { get, put, post, del } from '../../packages/shared/src/utils/networking';
import {
  copyAppPath,
  createRepoPath,
  repoSearchPath,
  userStarredListPath,
  userStarredRepoPath,
} from 'app-shared/api-paths';
import { IRepository } from 'app-shared/types/global';

export enum DataModellingFormat {
  Unknown = '0',
  XSD = '1',
  JSON = '2',
}

export type AddRepo = {
  org: string;
  repository: string;
  datamodellingPreference: DataModellingFormat;
};

const addRepo = async (repoToAdd: AddRepo): Promise<IRepository> => {
  return (await post(
    `${createRepoPath()}${buildQueryParams(repoToAdd)}`
  )) as unknown as IRepository;
};

export type Filters = {
  uid?: number;
  keyword?: string;
  sortby?: string;
  order?: string;
  page?: number;
  limit?: number;
};

export type SearchRepository = {
  data: IRepository[];
  ok: boolean;
  totalCount: number;
  totalPages: number;
};

const searchRepos = async (filter: Filters): Promise<SearchRepository> => {
  return await get(`${repoSearchPath()}${buildQueryParams(filter)}`);
};

const getStarredRepos = async (): Promise<IRepository[]> => {
  return get(userStarredListPath());
};

const setStarredRepo = (repo: IRepository): Promise<IRepository[]> => {
  return put(userStarredRepoPath(repo.owner.login, repo.name), {}) as unknown as Promise<
    IRepository[]
  >;
};

const unsetStarredRepo = (repo: IRepository): Promise<void> => {
  return del(userStarredRepoPath(repo.owner.login, repo.name));
};

const copyApp = (org: string, app: string, repoName: string): Promise<void> => {
  return post(copyAppPath(org, app, repoName));
};

const buildQueryParams = <T>(params: T): string => {
  const getQuerySeparator = (currentParamNumber: number) => {
    return currentParamNumber === 0 ? '?' : '&';
  };

  const queryParamsKeys = Object.keys(params);
  return queryParamsKeys
    .map((param, index) => `${getQuerySeparator(index)}${param}=${params[param]}`)
    .join('');
};

type RepoService = {
  addRepo: (repoToAdd: AddRepo) => Promise<IRepository>;
  searchRepos: (filter: Filters) => Promise<SearchRepository>;
  getStarredRepos: () => Promise<IRepository[]>;
  setStarredRepo: (repo: IRepository) => Promise<IRepository[]>;
  unsetStarredRepo: (repo: IRepository) => Promise<void>;
  copyApp: (org: string, app: string, repoName: string) => Promise<void>;
};

export const repoService: RepoService = {
  addRepo,
  searchRepos,
  getStarredRepos,
  setStarredRepo,
  unsetStarredRepo,
  copyApp,
};
