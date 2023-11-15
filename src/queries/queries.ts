import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { LAYOUT_SCHEMA_NAME } from 'src/features/devtools/utils/layoutSchemaValidation';
import { httpDelete, httpGetRaw, httpPost, putWithoutConfig } from 'src/utils/network/networking';
import { httpGet, httpPut } from 'src/utils/network/sharedNetworking';
import {
  applicationLanguagesUrl,
  applicationMetadataApiUrl,
  applicationSettingsApiUrl,
  currentPartyUrl,
  dataElementUrl,
  fileTagUrl,
  fileUploadUrl,
  getActiveInstancesUrl,
  getCreateInstancesUrl,
  getCustomValidationConfigUrl,
  getFetchFormDynamicsUrl,
  getFooterLayoutUrl,
  getJsonSchemaUrl,
  getLayoutSetsUrl,
  getLayoutSettingsUrl,
  getLayoutsUrl,
  getPartyValidationUrl,
  getPdfFormatUrl,
  getProcessNextUrl,
  getProcessStateUrl,
  getRulehandlerUrl,
  instancesControllerUrl,
  instantiateUrl,
  profileApiUrl,
  refreshJwtTokenUrl,
  textResourcesUrl,
  updateCookieUrl,
  validPartiesUrl,
} from 'src/utils/urls/appUrlHelper';
import { customEncodeURI, orgsListUrl } from 'src/utils/urls/urlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IFormDynamics } from 'src/features/form/dynamics';
import type { Instantiation } from 'src/features/instantiate/InstantiationContext';
import type { IPartyValidationResponse } from 'src/features/party';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { ITextResourceResult } from 'src/features/textResources';
import type { ILayoutFileExternal, IOption } from 'src/layout/common.generated';
import type { ILayoutCollection } from 'src/layout/layout';
import type { ILayoutSets, ILayoutSettings, ISimpleInstance } from 'src/types';
import type {
  IActionType,
  IAltinnOrgs,
  IAppLanguage,
  IApplicationSettings,
  IData,
  IInstance,
  IParty,
  IProcess,
  IProfile,
} from 'src/types/shared';
import type { IExpressionValidationConfig } from 'src/utils/validation/types';

const cleanUpInstanceData = async (_instance: IInstance | Promise<IInstance>) => {
  const instance = await _instance;
  if (instance && 'process' in instance) {
    // Even though the process state is part of the instance data we fetch from the server, we don't want to expose it
    // to the rest of the application. This is because the process state is also fetched separately, and that
    // is the one we want to use, as it contains more information about permissions than the instance data provides.
    delete instance.process;
  }

  return instance;
};

export const doPartyValidation = async (partyId: string): Promise<IPartyValidationResponse> =>
  (await httpPost(getPartyValidationUrl(partyId))).data;

export const doSelectParty = (partyId: string) => putWithoutConfig<IParty | null>(updateCookieUrl(partyId));

export const doInstantiateWithPrefill = async (data: Instantiation): Promise<IInstance> =>
  cleanUpInstanceData((await httpPost(instantiateUrl, undefined, data)).data);

export const doInstantiate = async (partyId: string): Promise<IInstance> =>
  cleanUpInstanceData((await httpPost(getCreateInstancesUrl(partyId))).data);

export const doProcessNext = async (taskId?: string, language?: string, action?: IActionType): Promise<IProcess> =>
  httpPut(getProcessNextUrl(taskId, language), action ? { action } : null);

export const doAttachmentUpload = async (dataTypeId: string, file: File): Promise<IData> => {
  const url = fileUploadUrl(dataTypeId);
  let contentType: string;
  if (!file.type) {
    contentType = `application/octet-stream`;
  } else if (file.name.toLowerCase().endsWith('.csv')) {
    contentType = 'text/csv';
  } else {
    contentType = file.type;
  }

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${customEncodeURI(file.name)}`,
    },
  };

  return (await httpPost(url, config, file)).data;
};

export const doAttachmentRemoveTag = async (dataGuid: string, tagToRemove: string): Promise<void> =>
  (await httpDelete(fileTagUrl(dataGuid, tagToRemove))).data;

export const doAttachmentAddTag = async (dataGuid: string, tagToAdd: string): Promise<void> => {
  const response = await httpPost(
    fileTagUrl(dataGuid, undefined),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify(tagToAdd),
  );
  if (response.status !== 201) {
    throw new Error('Failed to add tag to attachment');
  }

  return response.data;
};

export const doAttachmentRemove = async (dataGuid: string): Promise<void> => {
  const response = await httpDelete(dataElementUrl(dataGuid));
  if (response.status !== 200) {
    throw new Error('Failed to remove attachment');
  }
  return response.data;
};

/**
 * Query functions (these should use httpGet and start with 'fetch')
 */

export const fetchActiveInstances = (partyId: string): Promise<ISimpleInstance[]> =>
  httpGet(getActiveInstancesUrl(partyId));

export const fetchInstanceData = (partyId: string, instanceGuid: string): Promise<IInstance> =>
  cleanUpInstanceData(httpGet(`${instancesControllerUrl}/${partyId}/${instanceGuid}`));

export const fetchProcessState = (instanceId: string): Promise<IProcess> => httpGet(getProcessStateUrl(instanceId));

export const fetchProcessNextSteps = (): Promise<string[]> => httpGet(getProcessNextUrl());

export const fetchApplicationMetadata = (): Promise<IApplicationMetadata> => httpGet(applicationMetadataApiUrl);

export const fetchApplicationSettings = (): Promise<IApplicationSettings> => httpGet(applicationSettingsApiUrl);

export const fetchCurrentParty = () => httpGet(currentPartyUrl);

export const fetchFooterLayout = (): Promise<IFooterLayout> => httpGet(getFooterLayoutUrl());

export const fetchLayoutSets = (): Promise<ILayoutSets> => httpGet(getLayoutSetsUrl());

export const fetchLayouts = (layoutSetId: string | undefined): Promise<ILayoutCollection | ILayoutFileExternal> =>
  httpGet(getLayoutsUrl(layoutSetId));

export const fetchLayoutSettings = (layoutSetId: string | undefined): Promise<ILayoutSettings> =>
  httpGet(getLayoutSettingsUrl(layoutSetId));

export const fetchOptions = (url: string): Promise<AxiosResponse<IOption[], any>> => httpGetRaw(url);

export const fetchDataList = (url: string): Promise<IDataList> => httpGet(url);

export const fetchOrgs = (): Promise<{ orgs: IAltinnOrgs }> =>
  httpGet(orgsListUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

export const fetchParties = () => httpGet(validPartiesUrl);

export const fetchAppLanguages = (): Promise<IAppLanguage[]> => httpGet(applicationLanguagesUrl);

export const fetchRefreshJwtToken = () => httpGet(refreshJwtTokenUrl);

export const fetchCustomValidationConfig = (dataTypeId: string): Promise<IExpressionValidationConfig | null> =>
  httpGet(getCustomValidationConfigUrl(dataTypeId));

export const fetchUserProfile = (): Promise<IProfile> => httpGet(profileApiUrl);

export const fetchDataModelSchema = (dataTypeName: string): Promise<JSONSchema7> =>
  httpGet(getJsonSchemaUrl() + dataTypeName);

export const fetchFormData = (url: string, options?: AxiosRequestConfig): Promise<any> => httpGet(url, options);

export const fetchPdfFormat = (instanceId: string, dataGuid: string): Promise<IPdfFormat> =>
  httpGet(getPdfFormatUrl(instanceId, dataGuid));

export const fetchDynamics = (layoutSetId?: string): Promise<{ data: IFormDynamics } | null> =>
  httpGet(getFetchFormDynamicsUrl(layoutSetId));

export const fetchRuleHandler = (layoutSetId?: string): Promise<string | null> =>
  httpGet(getRulehandlerUrl(layoutSetId));

export const fetchTextResources = (selectedLanguage: string): Promise<ITextResourceResult> =>
  httpGet(textResourcesUrl(selectedLanguage));

export const fetchLayoutSchema = (): Promise<JSONSchema7 | undefined> => {
  // Hacky (and only) way to get the correct CDN url
  const schemaBaseUrl = document
    .querySelector('script[src$="altinn-app-frontend.js"]')
    ?.getAttribute('src')
    ?.replace('altinn-app-frontend.js', 'schemas/json/layout/');

  return schemaBaseUrl ? httpGet(`${schemaBaseUrl}${LAYOUT_SCHEMA_NAME}`) : Promise.resolve(undefined);
};
