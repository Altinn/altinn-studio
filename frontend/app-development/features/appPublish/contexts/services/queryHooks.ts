import type { IAppReleaseState } from '../../../../sharedResources/appRelease/appReleaseSlice';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from '../ServiceContext';
import type { IRepoStatusState } from '../../../../sharedResources/repoStatus/repoStatusSlice';
import { ILanguage } from '@altinn/schema-editor/types';

enum CacheKey {
  RepoStatus = 'REPO_STATUS',
  OrgList = 'ORG_LIST',
  FrontendLang = 'FRONTEND_LANG',
  DeploymentPermissions = 'DEPLOYMENT_PERMISSIONS',
  AppReleases = 'APP_RELEASES',
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

export const useDeploymentPermissions = (owner, app): UseQueryResult<IAppReleaseState[]> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<IAppReleaseState[]>([CacheKey.DeploymentPermissions, owner, app], () =>
    getDeployPermissions(owner, app)
  );
};

export const useAppReleases = (owner, app): UseQueryResult<IAppReleaseState[]> => {
  const { getAppreleases } = useServicesContext();
  return useQuery<IAppReleaseState[]>([CacheKey.AppReleases, owner, app], () =>
    getAppreleases(owner, app)
  );
};
