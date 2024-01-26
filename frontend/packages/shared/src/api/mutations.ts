import { del, get, post, put, patch } from 'app-shared/utils/networking';
import {
  appMetadataAttachmentPath,
  copyAppPath,
  createRepoPath,
  deploymentsPath,
  formLayoutNamePath,
  formLayoutPath,
  layoutSetsPath,
  layoutSetPath,
  layoutSettingsPath,
  releasesPath,
  repoCommitPath,
  repoCommitPushPath,
  repoPushPath,
  repoResetPath,
  ruleConfigPath,
  textResourceIdsPath,
  textResourcesPath,
  userLogoutPath,
  userStarredRepoPath,
  datamodelPath,
  resourcePolicyPath,
  resourceCreatePath,
  resourceEditPath,
  datamodelAddXsdFromRepoPath,
  createDatamodelPath,
  appPolicyPath,
  publishResourcePath,
  appMetadataPath,
  serviceConfigPath,
  importResourceFromAltinn2Path,
  processEditorPath,
  accessListPath,
  accessListsPath,
  accessListMemberPath,
  resourceAccessListPath,
} from 'app-shared/api/paths';
import type { AddLanguagePayload } from 'app-shared/types/api/AddLanguagePayload';
import type { AddRepoParams } from 'app-shared/types/api';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { CreateDeploymentPayload } from 'app-shared/types/api/CreateDeploymentPayload';
import type { CreateReleasePayload } from 'app-shared/types/api/CreateReleasePayload';
import type { CreateRepoCommitPayload } from 'app-shared/types/api/CreateRepoCommitPayload';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import type { LayoutSetConfig, LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings, ITextResourcesObjectFormat } from 'app-shared/types/global';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import type { UpdateTextIdPayload } from 'app-shared/types/api/UpdateTextIdPayload';
import { buildQueryParams } from 'app-shared/utils/urlUtils';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { CreateDatamodelPayload } from 'app-shared/types/api/CreateDatamodelPayload';
import type { Policy } from '@altinn/policy-editor';
import type { NewResource, AccessList, Resource, JsonPatch } from 'app-shared/types/ResourceAdm';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { Repository } from 'app-shared/types/Repository';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const addAppAttachmentMetadata = (org: string, app: string, payload: ApplicationAttachmentMetadata) => post<void, ApplicationAttachmentMetadata>(appMetadataAttachmentPath(org, app), payload);
export const addLanguageCode = (org: string, app: string, language: string, payload: AddLanguagePayload) => post<void, AddLanguagePayload>(textResourcesPath(org, app, language), payload);
export const addLayoutSet = (org: string, app: string, payload: LayoutSetConfig) => put(layoutSetsPath(org, app), payload);
export const addRepo = (repoToAdd: AddRepoParams) => post<Repository>(`${createRepoPath()}${buildQueryParams(repoToAdd)}`);
export const addXsdFromRepo = (org: string, app: string, modelPath: string) => post<JsonSchema>(datamodelAddXsdFromRepoPath(org, app, modelPath));
export const commitAndPushChanges = (org: string, app: string, payload: CreateRepoCommitPayload) => post<CreateRepoCommitPayload>(repoCommitPushPath(org, app), payload, { headers });
export const configureLayoutSet = (org: string, app: string, layoutSetName: string) => post<LayoutSets>(layoutSetPath(org, app, layoutSetName));
export const copyApp = (org: string, app: string, repoName: string) => post(copyAppPath(org, app, repoName));
export const createDatamodel = (org: string, app: string, payload: CreateDatamodelPayload) => post<JsonSchema, CreateDatamodelPayload>(createDatamodelPath(org, app), payload);
export const createDeployment = (org: string, app: string, payload: CreateDeploymentPayload) => post<void, CreateDeploymentPayload>(deploymentsPath(org, app), payload);
export const createRelease = (org: string, app: string, payload: CreateReleasePayload) => post<void, CreateReleasePayload>(releasesPath(org, app), payload);
export const createRepoCommit = (org: string, app: string, payload: CreateRepoCommitPayload) => post<CreateRepoCommitPayload>(repoCommitPath(org, app), payload, { headers });
export const deleteAppAttachmentMetadata = (org: string, app: string, id: string) => del(appMetadataAttachmentPath(org, app), { headers, data: id });
export const deleteDatamodel = (org: string, app: string, modelPath: string) => del(datamodelPath(org, app, modelPath, true));
export const deleteFormLayout = (org: string, app: string, layoutName: string, layoutSetName: string) => del(formLayoutPath(org, app, layoutName, layoutSetName));
export const deleteLanguageCode = (org: string, app: string, language: string) => del(textResourcesPath(org, app, language));
export const generateModels = (org: string, app: string, modelPath: string, payload: JsonSchema) => put<void, JsonSchema>(datamodelPath(org, app, modelPath, false), payload);
export const logout = () => post(userLogoutPath());
export const pushRepoChanges = (org: string, app: string) => post(repoPushPath(org, app));
export const resetRepoChanges = (org: string, app: string) => get(repoResetPath(org, app)); //Technically a mutation, but currently only implemented as a GET
export const saveDatamodel = (org: string, app: string, modelPath: string, payload: JsonSchema) => put<void, JsonSchema>(datamodelPath(org, app, modelPath, true), payload);
export const saveFormLayout = (org: string, app: string, layoutName: string, layoutSetName: string, payload: ExternalFormLayout) => post<void, ExternalFormLayout>(formLayoutPath(org, app, layoutName, layoutSetName), payload);
export const saveFormLayoutSettings = (org: string, app: string, layoutSetName: string, payload: ILayoutSettings) => post<ILayoutSettings>(layoutSettingsPath(org, app, layoutSetName), payload);
export const saveRuleConfig = (org: string, app: string, layoutSetName: string, payload: RuleConfig) => post<RuleConfig>(ruleConfigPath(org, app, layoutSetName), payload);
export const setStarredRepo = (org: string, app: string) => put(userStarredRepoPath(org, app), {});
export const unsetStarredRepo = (org: string, app: string) => del(userStarredRepoPath(org, app));
export const updateAppAttachmentMetadata = (org: string, app: string, payload: ApplicationAttachmentMetadata) => put<void, ApplicationAttachmentMetadata>(appMetadataAttachmentPath(org, app), payload);
export const updateFormLayoutName = (org: string, app: string, oldName: string, newName: string, layoutSetName: string) => post<void, string>(formLayoutNamePath(org, app, oldName, layoutSetName), JSON.stringify(newName), { headers: { 'Content-Type': 'application/json' } });
export const updateTextId = (org: string, app: string, payload: UpdateTextIdPayload) => put<void, UpdateTextIdPayload>(textResourceIdsPath(org, app), payload);
export const updateTranslationByLangCode = (org: string, app: string, language, payload) => post(textResourcesPath(org, app, language), payload);
export const updateAppPolicy = (org: string, app: string, payload: Policy) => put(appPolicyPath(org, app), payload);
export const updateAppMetadata = (org: string, app: string, payload: ApplicationMetadata) => put(appMetadataPath(org, app), payload);
export const updateAppConfig = (org: string, app: string, payload: AppConfig) => post(serviceConfigPath(org, app), payload);
export const upsertTextResources = (org: string, app: string, language: string, payload: ITextResourcesObjectFormat) => put<ITextResourcesObjectFormat>(textResourcesPath(org, app, language), payload);

// Resourceadm
export const createResource = (org: string, payload: NewResource) => post(resourceCreatePath(org), payload);
export const importResourceFromAltinn2 = (org: string, environment: string, code: string, edition: string, payload: string) => post<Resource>(importResourceFromAltinn2Path(org, environment, code, edition), JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
export const createAccessList = (org: string, environment: string, payload: Partial<AccessList>) => post<AccessList>(accessListsPath(org, environment), payload);
export const updateAccessList = (org: string, listId: string, environment: string, payload: JsonPatch[]) => patch<AccessList>(accessListPath(org, listId, environment), payload);
export const deleteAccessList = (org: string, listId: string, environment: string) => del(accessListPath(org, listId, environment));
export const addAccessListMember = (org: string, listId: string, orgnr: string, environment: string) => post(accessListMemberPath(org, listId, orgnr, environment));
export const removeAccessListMember = (org: string, listId: string, orgnr: string, environment: string) => del(accessListMemberPath(org, listId, orgnr, environment));
export const addResourceAccessList = (org: string, resourceId: string, listId: string, environment: string) => post(resourceAccessListPath(org, resourceId, listId, environment));
export const removeResourceAccessList = (org: string, resourceId: string, listId: string, environment: string) => del(resourceAccessListPath(org, resourceId, listId, environment));
export const publishResource = (org: string, repo: string, id: string, env: string) => post(publishResourcePath(org, repo, id, env), { headers: { 'Content-Type': 'application/json' } });
export const updatePolicy = (org: string, repo: string, id: string, payload: Policy) => put(resourcePolicyPath(org, repo, id), payload);
export const updateResource = (org: string, repo: string, payload: Resource) => put(resourceEditPath(org, repo), payload);

// ProcessEditor
export const updateBpmnXml = (org: string, app: string, bpmnXml: string) =>
  put(processEditorPath(org, app), bpmnXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
