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
}
interface IOrgsState {
  orgs: any;
}
export const useRepoStatus = (app, owner): UseQueryResult<IRepoStatusState> => {
  const { getRepoStatus } = useServicesContext();
  return useQuery<IRepoStatusState>([CacheKey.RepoStatus, app, owner], () =>
    getRepoStatus(app, owner)
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

export const useDeploymentPermissions = (org, app): UseQueryResult<IAppReleaseState[]> => {
  const { getDeployPermissions } = useServicesContext();
  return useQuery<IAppReleaseState[]>([CacheKey.DeploymentPermissions, org, app], () =>
    getDeployPermissions(org, app)
  );
};
