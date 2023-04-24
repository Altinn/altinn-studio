import type { UseQueryResult } from '@tanstack/react-query';
import { IDeployment } from '../../../sharedResources/appDeployment/types';
import { IRelease } from '../../../sharedResources/appRelease/types';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from '../../../types/QueryKey';
import { useServicesContext } from '../../../common/ServiceContext';
import { IDeployEnvironment } from "../containers/deployContainer";

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
  return useQuery<RepoStatus>([QueryKey.RepoStatus, owner, app], () => getRepoStatus(owner, app));
};

export const useOrgList = (): UseQueryResult<IOrgsState> => {
  const { getOrgList } = useServicesContext();
  return useQuery<IOrgsState>([QueryKey.OrgList], () => getOrgList());
};

export const useEnvironments = (): UseQueryResult<IDeployEnvironment[]> => {
  const { getEnvironments } = useServicesContext();
  return useQuery<IDeployEnvironment[]>([QueryKey.Environments], () => getEnvironments());
};

export const useDeployPermissions = (owner, app): UseQueryResult<string[]> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<string[]>([QueryKey.DeployPermissions, owner, app], () =>
    getDeployPermissions(owner, app)
  );
};

export const useAppReleases = (owner, app): UseQueryResult<IRelease[]> => {
  const { getAppReleases } = useServicesContext();
  return useQuery<IRelease[]>([QueryKey.AppReleases, owner, app], async () => {
    const res = await getAppReleases(owner, app);
    return res.results;
  });
};

export const useAppDeployments = (owner, app): UseQueryResult<IDeployment[]> => {
  const { getDeployments } = useServicesContext();
  return useQuery<IDeployment[]>([QueryKey.AppDeployments, owner, app], async () => {
    const res = await getDeployments(owner, app);
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
  return useQuery<BranchStatus>([QueryKey.BranchStatus, owner, app, branch], () =>
    getBranchStatus(owner, app, branch)
  );
};
