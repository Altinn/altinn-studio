import { del, get, patch, post, put } from 'app-shared/utils/networking';
import {
  appMetadataAttachmentPath,
  branchesPath,
  checkoutBranchPath,
  discardChangesPath,
  copyAppPath,
  createRepoPath,
  deploymentsPath,
  formLayoutNamePath,
  formLayoutPath,
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
  dataModelPath,
  resourcePolicyPath,
  resourceCreatePath,
  resourceEditPath,
  dataModelAddXsdFromRepoPath,
  createDataModelPath,
  appPolicyPath,
  publishResourcePath,
  appMetadataPath,
  serviceConfigPath,
  importResourceFromAltinn2Path,
  importResourceFromAltinn3Path,
  accessListPath,
  createAccessListsPath,
  accessListMemberPath,
  resourceAccessListPath,
  layoutSetPath,
  processEditorDataTypePath,
  processEditorDataTypesChangePath,
  dataModelsUploadPath,
  altinn2DelegationsMigrationPath,
  imagePath,
  addImagePath,
  optionListUploadPath,
  optionListUpdatePath,
  optionListIdUpdatePath,
  processEditorPath,
  selectedMaskinportenScopesPath,
  createInstancePath,
  dataTypePath,
  optionListPath,
  undeployAppFromEnvPath,
  orgCodeListPath,
  orgCodeListUploadPath,
  layoutPagesPath,
  orgTextResourcesPath,
  importCodeListFromOrgPath,
  layoutPageGroupsPath,
  layoutConvertToPageGroupsPath,
  layoutConvertToPageOrderPath,
  taskNavigationGroupPath,
  orgCodeListUpdateIdPath,
  orgLibraryUpdatePath,
  orgCodeListPublishPath,
} from 'app-shared/api/paths';
import type { AddLanguagePayload } from 'app-shared/types/api/AddLanguagePayload';
import type { AddRepoParams } from 'app-shared/types/api';
import type { ApplicationAttachmentMetadata } from 'app-shared/types/ApplicationAttachmentMetadata';
import type { CreateDeploymentPayload } from 'app-shared/types/api/CreateDeploymentPayload';
import type { CreateReleasePayload } from 'app-shared/types/api/CreateReleasePayload';
import type { CreateRepoCommitPayload } from 'app-shared/types/api/CreateRepoCommitPayload';
import type { LayoutSetPayload } from 'app-shared/types/api/LayoutSetPayload';
import type { ILayoutSettings, ITextResourcesObjectFormat, ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import type { UpdateTextIdPayload } from 'app-shared/types/api/UpdateTextIdPayload';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { CreateDataModelPayload } from 'app-shared/types/api/CreateDataModelPayload';
import type { Policy } from '../types/Policy';
import type { NewResource, AccessList, Resource, AccessListOrganizationNumbers, HeaderEtag, MigrateDelegationsRequest } from 'app-shared/types/ResourceAdm';
import type { Branch, RepoStatus } from 'app-shared/types/api/BranchTypes';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { Repository } from 'app-shared/types/Repository';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { AddLayoutSetResponse } from 'app-shared/types/api/AddLayoutSetResponse';
import type { DataTypesChange } from 'app-shared/types/api/DataTypesChange';
import type { FormLayoutRequest } from 'app-shared/types/api/FormLayoutRequest';
import type { Option } from 'app-shared/types/Option';
import type { MaskinportenScopes } from 'app-shared/types/MaskinportenScope';
import type { DataType } from '../types/DataType';
import type { CodeListWithTextResources } from 'app-shared/types/CodeListWithTextResources';
import type { CodeListsResponse } from 'app-shared/types/api/CodeListsResponse';
import type { PageModel } from '../types/api/dto/PageModel';
import type { PagesModel } from '../types/api/dto/PagesModel';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import type { ImportCodeListResponse } from 'app-shared/types/api/ImportCodeListResponse';
import type { UpdateSharedResourcesRequest } from 'app-shared/types/api/UpdateSharedResourcesRequest';
import type { PublishCodeListPayload } from 'app-shared/types/api/PublishCodeListPayload';

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const addAppAttachmentMetadata = (org: string, app: string, payload: ApplicationAttachmentMetadata) => post<void, ApplicationAttachmentMetadata>(appMetadataAttachmentPath(org, app), payload);
export const addLanguageCode = (org: string, app: string, language: string, payload: AddLanguagePayload) => post<void, AddLanguagePayload>(textResourcesPath(org, app, language), payload);
export const addLayoutSet = (org: string, app: string, layoutSetIdToUpdate: string, payload: LayoutSetPayload) => post<AddLayoutSetResponse>(layoutSetPath(org, app, layoutSetIdToUpdate), payload);
export const addImage = (org: string, app: string, form: FormData) => post<FormData>(addImagePath(org, app), form, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteImage = (org: string, app: string, imageName: string) => del(imagePath(org, app, imageName));

export const deleteLayoutSet = (org: string, app: string, layoutSetIdToUpdate: string) => del(layoutSetPath(org, app, layoutSetIdToUpdate));
export const deleteOptionList = (org: string, app: string, optionListId: string) => del(optionListPath(org, app, optionListId));
export const updateLayoutSetId = (org: string, app: string, layoutSetIdToUpdate: string, newLayoutSetId: string) => put(layoutSetPath(org, app, layoutSetIdToUpdate), newLayoutSetId, { headers: { 'Content-Type': 'application/json' } });
export const addRepo = (repoToAdd: AddRepoParams) => post<Repository>(createRepoPath(), repoToAdd);
export const addXsdFromRepo = (org: string, app: string, modelPath: string) => post<JsonSchema>(dataModelAddXsdFromRepoPath(org, app, modelPath));
export const commitAndPushChanges = (org: string, app: string, payload: CreateRepoCommitPayload) => post<CreateRepoCommitPayload>(repoCommitPushPath(org, app), payload, { headers });
export const copyApp = (org: string, app: string, newRepoName: string, newOrg: string) => post(copyAppPath(org, app, newRepoName, newOrg));
export const createDataModel = (org: string, app: string, payload: CreateDataModelPayload) => post<JsonSchema, CreateDataModelPayload>(createDataModelPath(org, app), payload);
export const createDeployment = (org: string, app: string, payload: CreateDeploymentPayload) => post<PipelineDeployment, CreateDeploymentPayload>(deploymentsPath(org, app), payload);
export const undeployAppFromEnv = (org: string, app: string, environment: string) => post(undeployAppFromEnvPath(org, app), { environment });
export const createRelease = (org: string, app: string, payload: CreateReleasePayload) => post<void, CreateReleasePayload>(releasesPath(org, app), payload);
export const createRepoCommit = (org: string, app: string, payload: CreateRepoCommitPayload) => post<CreateRepoCommitPayload>(repoCommitPath(org, app), payload, { headers });
export const deleteAppAttachmentMetadata = (org: string, app: string, id: string) =>
  del(appMetadataAttachmentPath(org, app), {
    headers,
    data: id,
  });
export const deleteDataModel = (org: string, app: string, modelPath: string) => del(dataModelPath(org, app, modelPath, true));
export const deleteFormLayout = (org: string, app: string, layoutName: string, layoutSetName: string) => del(formLayoutPath(org, app, layoutName, layoutSetName));
export const deleteLanguageCode = (org: string, app: string, language: string) => del(textResourcesPath(org, app, language));
export const generateModels = (org: string, app: string, modelPath: string, payload: JsonSchema) => put<void, JsonSchema>(dataModelPath(org, app, modelPath, false), payload);
export const logout = () => post(userLogoutPath());
export const publishCodeList = (org: string, payload: PublishCodeListPayload) => post<void, PublishCodeListPayload>(orgCodeListPublishPath(org), payload);
export const pushRepoChanges = (org: string, app: string) => post(repoPushPath(org, app));
export const resetRepoChanges = (org: string, app: string) => get(repoResetPath(org, app)); //Technically a mutation, but currently only implemented as a GET
export const saveDataModel = (org: string, app: string, modelPath: string, payload: JsonSchema) => put<void, JsonSchema>(dataModelPath(org, app, modelPath, true), payload);
export const saveFormLayout = (org: string, app: string, layoutName: string, layoutSetName: string, payload: FormLayoutRequest) => post<void, FormLayoutRequest>(formLayoutPath(org, app, layoutName, layoutSetName), payload);
export const saveFormLayoutV3 = (org: string, app: string, layoutName: string, layoutSetName: string, payload: FormLayoutRequest) => post<void, FormLayoutRequest>(formLayoutPath(org, app, layoutName, layoutSetName), payload);
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
export const uploadDataModel = (org: string, app: string, form: FormData) => post<void, FormData>(dataModelsUploadPath(org, app), form, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateDataType = (org: string, app: string, dataModelName: string, payload: DataType) => put<void>(dataTypePath(org, app, dataModelName), payload);
export const uploadOptionList = (org: string, app: string, payload: FormData) => post<void, FormData>(optionListUploadPath(org, app), payload, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateOptionList = (org: string, app: string, optionsListId: string, payload: Option[]) => put<Option[]>(optionListUpdatePath(org, app, optionsListId), payload);
export const updateOptionListId = (org: string, app: string, optionsListId: string, newOptionsListId: string) => put<void, string>(optionListIdUpdatePath(org, app, optionsListId), JSON.stringify(newOptionsListId), { headers: { 'Content-Type': 'application/json' } });
export const updateTaskNavigationGroup = (org: string, app: string, payload: TaskNavigationGroup[]) => post<TaskNavigationGroup[]>(taskNavigationGroupPath(org, app), payload);
export const importCodeListFromOrgToApp = (org: string, app: string, codeListId: string): Promise<ImportCodeListResponse> => post<ImportCodeListResponse>(importCodeListFromOrgPath(org, app, codeListId));
export const upsertTextResources = (org: string, app: string, language: string, payload: ITextResourcesObjectFormat): Promise<ITextResourcesWithLanguage> => put<ITextResourcesWithLanguage, ITextResourcesObjectFormat>(textResourcesPath(org, app, language), payload);
export const createPage = (org: string, app: string, layoutSetName: string, payload: PageModel) => post(layoutPagesPath(org, app, layoutSetName), payload);
export const deletePage = (org: string, app: string, layoutSetName: string, pageName: string) => del(layoutPagesPath(org, app, layoutSetName, pageName));
export const modifyPage = (org: string, app: string, layoutSetName: string, pageName: string, payload: PageModel) => put(layoutPagesPath(org, app, layoutSetName, pageName), payload);
export const changePageOrder = (org: string, app: string, layoutSetName: string, pages: PagesModel) => put(layoutPagesPath(org, app, layoutSetName), pages);
export const changePageGroups = (org: string, app: string, layoutSetName: string, pageGroups: PagesModel) => put(layoutPageGroupsPath(org, app, layoutSetName), pageGroups);
export const convertToPageGroups = (org: string, app: string, layoutSetName: string) => post(layoutConvertToPageGroupsPath(org, app, layoutSetName));
export const convertToPageOrder = (org: string, app: string, layoutSetName: string) => post(layoutConvertToPageOrderPath(org, app, layoutSetName));

// Resourceadm
export const createResource = (org: string, payload: NewResource) => post(resourceCreatePath(org), payload);
export const importResourceFromAltinn2 = (org: string, environment: string, code: string, edition: string, payload: string) => post<Resource>(importResourceFromAltinn2Path(org, environment, code, edition), JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
export const importResourceFromAltinn3 = (org: string, resourceId: string, environment: string) => post<Resource>(importResourceFromAltinn3Path(org, resourceId, environment));
export const createAccessList = (org: string, environment: string, payload: Partial<AccessList>) => post<AccessList>(createAccessListsPath(org, environment), payload);
export const updateAccessList = (org: string, listId: string, environment: string, payload: AccessList) => put<AccessList>(accessListPath(org, listId, environment), payload);
export const deleteAccessList = (org: string, listId: string, environment: string, etag: string) => del(accessListPath(org, listId, environment, etag));
export const addAccessListMember = (org: string, listId: string, environment: string, payload: AccessListOrganizationNumbers) => post<HeaderEtag, AccessListOrganizationNumbers>(accessListMemberPath(org, listId, environment), payload);
export const removeAccessListMember = (org: string, listId: string, environment: string, payload: AccessListOrganizationNumbers) => del<HeaderEtag>(accessListMemberPath(org, listId, environment), { data: payload });
export const addResourceAccessList = (org: string, resourceId: string, listId: string, environment: string) => post(resourceAccessListPath(org, resourceId, listId, environment));
export const removeResourceAccessList = (org: string, resourceId: string, listId: string, environment: string) => del(resourceAccessListPath(org, resourceId, listId, environment));
export const publishResource = (org: string, repo: string, id: string, env: string) => post(publishResourcePath(org, repo, id, env), { headers: { 'Content-Type': 'application/json' } });
export const updatePolicy = (org: string, repo: string, id: string, payload: Policy) => put(resourcePolicyPath(org, repo, id), payload);
export const updateResource = (org: string, repo: string, payload: Resource) => put(resourceEditPath(org, repo), payload);
export const migrateDelegations = (org: string, env: string, payload: MigrateDelegationsRequest) => post(altinn2DelegationsMigrationPath(org, env), payload);

// Preview
export const createPreviewInstance = (org: string, app: string, partyId: number, taskId: string) => post<any>(createInstancePath(org, app, partyId, taskId), {}, { headers });

// ProcessEditor

export const addDataTypeToAppMetadata = (org: string, app: string, dataTypeId: string, taskId: string, allowedContributors?: Array<string>) => post(processEditorDataTypePath(org, app, dataTypeId, taskId), allowedContributors);
export const deleteDataTypeFromAppMetadata = (org: string, app: string, dataTypeId: string) => del(processEditorDataTypePath(org, app, dataTypeId));

export const updateBpmnXml = (org: string, app: string, form: any) =>
  put(processEditorPath(org, app), form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const updateProcessDataTypes = (org: string, app: string, dataTypesChange: DataTypesChange) => put(processEditorDataTypesChangePath(org, app), dataTypesChange);

// Maskinporten
export const updateSelectedMaskinportenScopes = (org: string, app: string, appScopesUpsertRequest: MaskinportenScopes) => put(selectedMaskinportenScopesPath(org, app), appScopesUpsertRequest);

// Organisation library
export const updateSharedResources = async (org: string, payload: UpdateSharedResourcesRequest): Promise<void> => put(orgLibraryUpdatePath(org), payload);

// Organisation library code lists:
export const createOrgCodeList = async (org: string, codeListId: string, payload: CodeListWithTextResources): Promise<CodeListsResponse> => post(orgCodeListPath(org, codeListId), payload);
export const updateOrgCodeList = async (org: string, codeListId: string, payload: CodeListWithTextResources): Promise<CodeListsResponse> => put(orgCodeListPath(org, codeListId), payload);
export const updateOrgCodeListId = async (org: string, codeListId: string, payload: string): Promise<void> => put<void, string>(orgCodeListUpdateIdPath(org, codeListId), payload, { headers: { 'Content-Type': 'application/json' } });
export const deleteOrgCodeList = async (org: string, codeListId: string): Promise<CodeListsResponse> => del(orgCodeListPath(org, codeListId));
export const uploadOrgCodeList = async (org: string, payload: FormData): Promise<CodeListsResponse> => post(orgCodeListUploadPath(org), payload);

// Organisation text resources:
export const createOrgTextResources = async (org: string, language: string, payload: ITextResourcesWithLanguage): Promise<ITextResourcesWithLanguage> => post<ITextResourcesWithLanguage, ITextResourcesWithLanguage>(orgTextResourcesPath(org, language), payload);
export const updateOrgTextResources = async (org: string, language: string, payload: KeyValuePairs<string>): Promise<ITextResourcesWithLanguage> => patch<ITextResourcesWithLanguage, KeyValuePairs<string>>(orgTextResourcesPath(org, language), payload);

// Branches:
export const createBranch = async (org: string, app: string, branchName: string): Promise<Branch> => post(branchesPath(org, app), { branchName });
export const checkoutBranch = async (org: string, app: string, branchName: string): Promise<RepoStatus> => post(checkoutBranchPath(org, app), { branchName });
export const discardChanges = async (org: string, app: string): Promise<RepoStatus> => post(discardChangesPath(org, app), {});
