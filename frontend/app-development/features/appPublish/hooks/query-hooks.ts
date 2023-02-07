import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from '../contexts/ServiceContext';
import type { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusSlice';
import { ILanguage } from '@altinn/schema-editor/types';
import { IDeployPermissions } from '../../../sharedResources/user/userSlice';
import { IRelease } from '../../../sharedResources/appRelease/types';
import { IDeployment } from '../../../sharedResources/appDeployment/types';

enum CacheKey {
  RepoStatus = 'REPO_STATUS',
  OrgList = 'ORG_LIST',
  FrontendLang = 'FRONTEND_LANG',
  DeployPermissions = 'DEPLOY_PERMISSIONS',
  AppReleases = 'APP_RELEASES',
  AppDeployments = 'APP_DEPLOYMENTS',
}
interface IOrgsState {
  orgs: any;
}
export const useRepoStatus = (owner, app): UseQueryResult<IRepoStatusState> => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<IRepoStatusState>([CacheKey.RepoStatus, owner, app], () =>
    getRepoStatus(owner, app)
  );
};
export const useOrgList = (): UseQueryResult<IOrgsState> => {
  const { getOrgList } = useServicesContext();
  return useQuery<IOrgsState>([CacheKey.OrgList], () => getOrgList());
};

export const useFrontendLang = (locale: string): UseQueryResult<ILanguage> => {
  const { getFrontendLang } = useServicesContext();
  return useQuery<ILanguage>([CacheKey.FrontendLang, locale], () => getFrontendLang(locale));
};

export const useDeployPermissions = (owner, app): UseQueryResult<IDeployPermissions> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<IDeployPermissions>([CacheKey.DeployPermissions, owner, app], () =>
    getDeployPermissions(owner, app)
  );
};

export const useAppReleases = (owner, app): UseQueryResult<IRelease[]> => {
  const { getAppReleases } = useServicesContext();
  return useQuery<IRelease[]>([CacheKey.AppReleases, owner, app], () => getAppReleases(owner, app));
};

export const useAppDeployments = (owner, app): UseQueryResult<IDeployment[]> => {
  const { getAppDeployments } = useServicesContext();
  return useQuery<IDeployment[]>([CacheKey.AppDeployments, owner, app], () =>
    getAppDeployments(owner, app)
  );
};
