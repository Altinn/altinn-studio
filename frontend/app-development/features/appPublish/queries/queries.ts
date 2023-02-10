import { get } from 'app-shared/utils/networking';
import {
  appReleasesPath,
  appDeploymentsPath,
  deployPermissionsPath,
  frontendLangPath,
  repoStatusPath,
  branchStatusPath,
} from 'app-shared/api-paths';
import { environmentsConfigUrl, orgsListUrl } from 'app-shared/cdn-paths';

export const getAppReleases = (owner, app) =>
  get(appReleasesPath(owner, app) + '?sortDirection=Descending');
export const getDeployPermissions = (owner, app) => get(deployPermissionsPath(owner, app));
export const getFrontendLang = (locale: string) => get(frontendLangPath(locale));
export const getOrgList = () => get(orgsListUrl());
export const getRepoStatus = (owner: string, app: string) => get(repoStatusPath(owner, app));
export const getAppDeployments = (owner: string, app: string) =>
  get(appDeploymentsPath(owner, app));
export const getBranchStatus = (owner, app, branch) => get(branchStatusPath(owner, app, branch));
export const getEnvironments = () => get(environmentsConfigUrl());
