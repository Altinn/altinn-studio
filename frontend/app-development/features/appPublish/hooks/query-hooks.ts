import type { UseQueryResult } from '@tanstack/react-query';
import { IDeployment } from '../../../sharedResources/appDeployment/types';
import { ILanguage } from '@altinn/schema-editor/types';
import { IRelease } from '../../../sharedResources/appRelease/types';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from '../contexts/ServiceContext';
import { IEnvironmentItem } from '../../../sharedResources/appCluster/appClusterSlice';

export enum CacheKey {
  RepoStatus = 'REPO_STATUS',
  OrgList = 'ORG_LIST',
  FrontendLang = 'FRONTEND_LANG',
  DeployPermissions = 'DEPLOY_PERMISSIONS',
  AppReleases = 'APP_RELEASES',
  AppDeployments = 'APP_DEPLOYMENTS',
  BranchStatus = 'BRANCH_STATUS',
  Environemnts = 'ENVIRONMENTS',
}
interface IOrgsState {
  orgs: any;
}

export interface RepoStatus {
  aheadBy: number;
  behindBy: number;
  contentStatus: any[];
  hasMergeConflict: boolean;
  repositoryStatus: string;
}
export const useRepoStatus = (owner, app): UseQueryResult<RepoStatus> => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<RepoStatus>([CacheKey.RepoStatus, owner, app], () => getRepoStatus(owner, app));
};

export const useOrgList = (): UseQueryResult<IOrgsState> => {
  const { getOrgList } = useServicesContext();
  return useQuery<IOrgsState>([CacheKey.OrgList], () => getOrgList());
};

export const useEnvironments = (): UseQueryResult<IEnvironmentItem[]> => {
  const { getEnvironments } = useServicesContext();
  return useQuery<IEnvironmentItem[]>([CacheKey.Environemnts], async () => {
    const res = await getEnvironments();
    return res.environments;
  });
};

export const useFrontendLang = (locale: string): UseQueryResult<ILanguage> => {
  const { getFrontendLang } = useServicesContext();
  return useQuery<ILanguage>([CacheKey.FrontendLang, locale], () => getFrontendLang(locale));
};

export const useDeployPermissions = (owner, app): UseQueryResult<string[]> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<string[]>([CacheKey.DeployPermissions, owner, app], () =>
    getDeployPermissions(owner, app)
  );
};

export const useAppReleases = (owner, app): UseQueryResult<IRelease[]> => {
  const { getAppReleases } = useServicesContext();
  return useQuery<IRelease[]>([CacheKey.AppReleases, owner, app], async () => {
    const res = await getAppReleases(owner, app);
    return res.results;
  });
};

export const useAppDeployments = (owner, app): UseQueryResult<IDeployment[]> => {
  const { getAppDeployments } = useServicesContext();
  return useQuery<IDeployment[]>([CacheKey.AppDeployments, owner, app], async () => {
    const res = await getAppDeployments(owner, app);
    return res.results;
  });
};
export interface BranchStatus {
  commit: {
    author: any; //unused
    committer: any; //unused
    id: string;
  };
  name: string;
}
export const useBranchStatus = (owner, app, branch): UseQueryResult<BranchStatus> => {
  const { getBranchStatus } = useServicesContext();
  return useQuery<BranchStatus>([CacheKey.BranchStatus, owner, app, branch], () =>
    getBranchStatus(owner, app, branch)
  );
};
