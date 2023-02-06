import { get } from 'app-shared/utils/networking';
import {
  appReleasesPath,
  deploymentsPath,
  deployPermissionsPath,
  frontendLangPath,
  repoStatusPath,
} from 'app-shared/api-paths';
import { orgsListUrl } from 'app-shared/cdn-paths';

export const getAppreleases = (owner, app) => get(appReleasesPath(owner, app));
export const getDeployPermissions = (owner, app) => get(deployPermissionsPath(owner, app));
export const getFrontendLang = (locale: string) => get(frontendLangPath(locale));
export const getOrgList = () => get(orgsListUrl());
export const getRepoStatus = (owner: string, app: string) => get(repoStatusPath(owner, app));
export const getAppDeployments = (owner: string, app: string) => get(deploymentsPath(owner, app));
