import { get } from 'app-shared/utils/networking';
import {
  releasesPath,
  deploymentsPath,
  deployPermissionsPath,
  repoStatusPath,
  branchStatusPath,
  envConfigPath,
  repoMetaPath,
  repoPullPath,
} from 'app-shared/api-paths';
import { orgsListUrl } from 'app-shared/cdn-paths';

export const getAppReleases = (owner, app) => get(releasesPath(owner, app, 'Descending'));
export const getBranchStatus = (owner, app, branch) => get(branchStatusPath(owner, app, branch));
export const getDeployPermissions = (owner, app) => get(deployPermissionsPath(owner, app));
export const getDeployments = (owner, app) => get(deploymentsPath(owner, app, 'Descending'));
export const getEnvironments = () => get(envConfigPath());
export const getOrgList = () => get(orgsListUrl());
export const getRepoStatus = (owner, app) => get(repoStatusPath(owner, app));
export const getRepoMetadata = (owner, app) => get(repoMetaPath(owner, app));
export const getRepoPull = (owner, app) => get(repoPullPath(owner, app));
