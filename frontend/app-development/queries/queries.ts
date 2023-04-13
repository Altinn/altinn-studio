import { get } from 'app-shared/utils/networking';
import {
  branchStatusPath,
  deployPermissionsPath,
  deploymentsPath,
  envConfigPath,
  releasesPath,
  repoMetaPath,
  repoPullPath,
  repoStatusPath,
  textLanguagesPath,
  textResourcesPath,
  datamodelsXsdPath,
  datamodelMetadataPath,
  formLayoutsPath,
  layoutSettingsPath,
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
export const getTextResources = (owner, app, lang) => get(textResourcesPath(owner, app, lang));
export const getTextLanguages = (owner, app) => get(textLanguagesPath(owner, app));
export const getDatamodelsXsd = (owner, app) => get(datamodelsXsdPath(owner, app));
export const getDatamodel = (owner, app) => get(datamodelMetadataPath(owner, app));
export const getFormLayouts = (owner, app) => get(formLayoutsPath(owner, app));
export const getFormLayoutSettings = (owner, app) => get(layoutSettingsPath(owner, app));
