import { del, post, put } from 'app-shared/utils/networking';
import {
  appMetadataAttachmentPath,
  copyAppPath,
  createRepoPath,
  deploymentsPath,
  formLayoutNamePath,
  formLayoutPath,
  layoutSetsPath,
  layoutSettingsPath,
  releasesPath,
  repoCommitPath,
  repoPushPath,
  ruleConfigPath,
  textResourceIdsPath,
  textResourcesPath,
  userLogoutPath,
  userStarredRepoPath,
} from 'app-shared/api/paths';
import { AddLanguagePayload } from 'app-shared/types/api/AddLanguagePayload';
import { AddRepoParams } from 'app-shared/types/api';
import { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import { CreateDeploymentPayload } from 'app-shared/types/api/CreateDeploymentPayload';
import { CreateReleasePayload } from 'app-shared/types/api/CreateReleasePayload';
import { CreateRepoCommitPayload } from 'app-shared/types/api/CreateRepoCommitPayload';
import { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { LayoutSetConfig, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import {
  ILayoutSettings,
  IRepository,
  ITextResourcesObjectFormat
} from 'app-shared/types/global';
import { RuleConfig } from 'app-shared/types/RuleConfig';
import { UpdateTextIdPayload } from 'app-shared/types/api/UpdateTextIdPayload';
import { buildQueryParams } from 'app-shared/utils/urlUtils';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const addAppAttachmentMetadata = (org: string, app: string, payload: ApplicationAttachmentMetadata) => post<void, ApplicationAttachmentMetadata>(appMetadataAttachmentPath(org, app), payload);
export const addLanguageCode = (org: string, app: string, language: string, payload: AddLanguagePayload) => post<void, AddLanguagePayload>(textResourcesPath(org, app, language), payload);
export const addLayoutSet = (org: string, app: string, payload: LayoutSetConfig) => put(layoutSetsPath(org, app), payload);
export const addRepo = (repoToAdd: AddRepoParams) => post<IRepository>(`${createRepoPath()}${buildQueryParams(repoToAdd)}`);
export const copyApp = (org: string, app: string, repoName: string) => post(copyAppPath(org, app, repoName));
export const createDeployment = (org: string, app: string, payload: CreateDeploymentPayload) => post<void, CreateDeploymentPayload>(deploymentsPath(org, app), payload);
export const configureLayoutSet = (org: string, app: string, layoutSetName: string) => post<LayoutSets>(layoutSetsPath(org, app, layoutSetName));
export const createRelease = (org: string, app: string, payload: CreateReleasePayload) => post<void, CreateReleasePayload>(releasesPath(org, app), payload);
export const createRepoCommit = (org: string, app: string, payload: CreateRepoCommitPayload) => post<CreateRepoCommitPayload>(repoCommitPath(org, app), payload, { headers });
export const deleteAppAttachmentMetadata = (org: string, app: string, id: string) => del(appMetadataAttachmentPath(org, app), { headers, data: id });
export const deleteFormLayout = (org: string, app: string, layoutName: string, layoutSetName: string) => del(formLayoutPath(org, app, layoutName, layoutSetName));
export const deleteLanguageCode = (org: string, app: string, language: string) => del(textResourcesPath(org, app, language));
export const logout = () => post(userLogoutPath());
export const pushRepoChanges = (org: string, app: string) => post(repoPushPath(org, app));
export const saveFormLayout = (org: string, app: string, layoutName: string, layoutSetName: string, payload: ExternalFormLayout) => post<void, ExternalFormLayout>(formLayoutPath(org, app, layoutName, layoutSetName), payload);
export const saveFormLayoutSettings = (org: string, app: string, layoutSetName: string, payload: ILayoutSettings) => post<ILayoutSettings>(layoutSettingsPath(org, app, layoutSetName), payload);
export const saveRuleConfig = (org: string, app: string, layoutSetName: string, payload: RuleConfig) => post<RuleConfig>(ruleConfigPath(org, app, layoutSetName), payload);
export const setStarredRepo = (repo: IRepository) => put<IRepository[]>(userStarredRepoPath(repo.owner.login, repo.name), {});
export const unsetStarredRepo = (repo: IRepository) => del(userStarredRepoPath(repo.owner.login, repo.name));
export const updateAppAttachmentMetadata = (org: string, app: string, payload: ApplicationAttachmentMetadata) => post<void, ApplicationAttachmentMetadata>(appMetadataAttachmentPath(org, app), payload);
export const updateFormLayoutName = (org: string, app: string, oldName: string, newName: string, layoutSetName: string) => post<void, string>(formLayoutNamePath(org, app, oldName, layoutSetName), JSON.stringify(newName), { headers: { 'Content-Type': 'application/json' } });
export const updateTextId = (org: string, app: string, payload: UpdateTextIdPayload) => put<void, UpdateTextIdPayload>(textResourceIdsPath(org, app), payload);
export const updateTranslationByLangCode = (org: string, app: string, language, payload) => post(textResourcesPath(org, app, language), payload);
export const upsertTextResources = (org: string, app: string, language: string, payload: ITextResourcesObjectFormat) => put<ITextResourcesObjectFormat>(textResourcesPath(org, app, language), payload);
