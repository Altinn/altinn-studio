import { get } from 'app-shared/utils/networking';
import {
  releasesPath,
  deploymentsPath,
  deployPermissionsPath,
  repoStatusPath,
  branchStatusPath,
} from 'app-shared/api-paths';
import { orgsListUrl, environmentConfigUrl } from 'app-shared/cdn-paths';
const d = '?sortDirection=Descending';

export const getAppReleases = (owner, app) => get(releasesPath(owner, app) + d);
export const getDeployPermissions = (owner, app) => get(deployPermissionsPath(owner, app));
export const getOrgList = () => get(orgsListUrl());
export const getRepoStatus = (owner, app) => get(repoStatusPath(owner, app));
export const getDeployments = (owner, app) => get(deploymentsPath(owner, app) + d);
export const getBranchStatus = (owner, app, branch) => get(branchStatusPath(owner, app, branch));
export const getEnvironments = () => get(environmentConfigUrl());
