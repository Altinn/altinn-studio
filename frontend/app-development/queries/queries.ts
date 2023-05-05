import { get } from 'app-shared/utils/networking';
import {
  branchStatusPath,
  datamodelMetadataPath,
  datamodelsXsdPath,
  deployPermissionsPath,
  deploymentsPath,
  envConfigPath,
  formLayoutsPath,
  layoutSettingsPath,
  releasesPath,
  repoMetaPath,
  repoPullPath,
  repoStatusPath,
  ruleConfigPath,
  ruleHandlerPath,
  textLanguagesPath,
  textResourcesPath,
  userCurrentPath,
} from 'app-shared/api-paths';
import { orgsListUrl } from 'app-shared/cdn-paths';
import { ITextResourcesWithLanguage } from 'app-shared/types/global';

export const getAppReleases = (owner: string, app: string) => get(releasesPath(owner, app, 'Descending'));
export const getBranchStatus = (owner: string, app: string, branch: string) => get(branchStatusPath(owner, app, branch));
export const getDatamodel = (owner: string, app: string) => get(datamodelMetadataPath(owner, app));
export const getDatamodelsXsd = (owner: string, app: string) => get(datamodelsXsdPath(owner, app));
export const getDeployPermissions = (owner: string, app: string) => get(deployPermissionsPath(owner, app));
export const getDeployments = (owner: string, app: string) => get(deploymentsPath(owner, app, 'Descending'));
export const getEnvironments = () => get(envConfigPath());
export const getFormLayoutSettings = (owner: string, app: string) => get(layoutSettingsPath(owner, app));
export const getFormLayouts = (owner: string, app: string) => get(formLayoutsPath(owner, app));
export const getOrgList = () => get(orgsListUrl());
export const getRepoMetadata = (owner: string, app: string) => get(repoMetaPath(owner, app));
export const getRepoPull = (owner: string, app: string) => get(repoPullPath(owner, app));
export const getRepoStatus = (owner: string, app: string) => get(repoStatusPath(owner, app));
export const getRuleConfig = (owner: string, app: string) => get(ruleConfigPath(owner, app));
export const getRuleModel = (owner: string, app: string) => get(ruleHandlerPath(owner, app));
export const getTextLanguages = (owner: string, app: string): Promise<string[]> => get(textLanguagesPath(owner, app));
export const getTextResources = (owner: string, app: string, lang: string): Promise<ITextResourcesWithLanguage> => get(textResourcesPath(owner, app, lang));
export const getUser = () => get(userCurrentPath());
