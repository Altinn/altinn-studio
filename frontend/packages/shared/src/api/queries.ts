import { get } from 'app-shared/utils/networking';
import {
  branchStatusPath,
  datamodelMetadataPath,
  datamodelsXsdPath,
  deployPermissionsPath,
  deploymentsPath,
  envConfigPath,
  formLayoutsPath,
  instanceIdForPreviewPath,
  layoutSetsPath,
  layoutSettingsPath,
  orgsListPath,
  releasesPath,
  repoMetaPath,
  repoPullPath,
  repoSearchPath,
  repoStatusPath,
  ruleConfigPath,
  ruleHandlerPath,
  textLanguagesPath,
  textResourcesPath,
  userCurrentPath,
  userStarredListPath,
  widgetSettingsPath,
} from './paths';
import {
  AppDeploymentsResponse,
  AppReleasesResponse,
  DatamodelMetadataResponse,
  SearchRepoFilterParams,
  SearchRepositoryResponse,
} from 'app-shared/types/api';
import { BranchStatus } from 'app-shared/types/BranchStatus';
import { DatamodelsXsd } from 'app-shared/types/DatamodelsXsd';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { ILayoutSettings, IRepository, ITextResourcesWithLanguage } from 'app-shared/types/global';
import { Organization } from 'app-shared/types/Organization';
import { OrgsState } from 'app-shared/types/OrgsState';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { Repository } from 'app-shared/types/Repository';
import { RuleConfig } from 'app-shared/types/RuleConfig';
import { User } from 'app-shared/types/User';
import { WidgetSettingsResponse } from 'app-shared/types/widgetTypes';
import { buildQueryParams } from 'app-shared/utils/urlUtils';
import { orgsListUrl } from '../cdn-paths';

export const getAppReleases = (owner: string, app: string) => get<AppReleasesResponse>(releasesPath(owner, app, 'Descending'));
export const getBranchStatus = (owner: string, app: string, branch: string) => get<BranchStatus>(branchStatusPath(owner, app, branch));
export const getDatamodel = (owner: string, app: string) => get<DatamodelMetadataResponse>(datamodelMetadataPath(owner, app));
export const getDatamodelsXsd = (owner: string, app: string) => get<DatamodelsXsd[]>(datamodelsXsdPath(owner, app));
export const getDeployPermissions = (owner: string, app: string) => get<string[]>(deployPermissionsPath(owner, app));
export const getDeployments = (owner: string, app: string) => get<AppDeploymentsResponse>(deploymentsPath(owner, app, 'Descending'));
export const getEnvironments = () => get<DeployEnvironment[]>(envConfigPath());
export const getFormLayoutSettings = (owner: string, app: string, layoutSetName: string) => get<ILayoutSettings>(layoutSettingsPath(owner, app, layoutSetName));
export const getFormLayouts = (owner: string, app: string, layoutSetName: string) => get<FormLayoutsResponse>(formLayoutsPath(owner, app, layoutSetName));
export const getLayoutSets = (owner: string, app: string) => get<LayoutSets>(layoutSetsPath(owner, app));
export const getInstanceIdForPreview = (owner: string, app: string) => get<string>(instanceIdForPreviewPath(owner, app));
export const getOrgList = () => get<OrgsState>(orgsListUrl());
export const getOrganizations = () => get<Organization[]>(orgsListPath());
export const getRepoMetadata = (owner: string, app: string) => get<Repository>(repoMetaPath(owner, app));
export const getRepoPull = (owner: string, app: string) => get<RepoStatus>(repoPullPath(owner, app));
export const getRepoStatus = (owner: string, app: string) => get<RepoStatus>(repoStatusPath(owner, app));
export const getRuleConfig = (owner: string, app: string, layoutSetName: string) => get<RuleConfig>(ruleConfigPath(owner, app, layoutSetName));
export const getRuleModel = (owner: string, app: string, layoutSetName: string) => get(ruleHandlerPath(owner, app, layoutSetName));
export const getStarredRepos = () => get<IRepository[]>(userStarredListPath());
export const getTextLanguages = (owner: string, app: string): Promise<string[]> => get(textLanguagesPath(owner, app));
export const getTextResources = (owner: string, app: string, lang: string) => get<ITextResourcesWithLanguage>(textResourcesPath(owner, app, lang));
export const getUser = () => get<User>(userCurrentPath());
export const getWidgetSettings = (owner: string, app: string) => get<WidgetSettingsResponse | null>(widgetSettingsPath(owner, app));
export const searchRepos = (filter: SearchRepoFilterParams) => get<SearchRepositoryResponse>(`${repoSearchPath()}${buildQueryParams(filter)}`);
