import axios from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { LAYOUT_SCHEMA_NAME } from 'src/features/devtools/utils/layoutSchemaValidation';
import { removeProcessFromInstance } from 'src/features/instance/instanceUtils';
import { signingQueries } from 'src/layout/SigneeList/api';
import { getFileContentType } from 'src/utils/attachmentsUtils';
import { httpDelete, httpGetRaw, httpPatch, httpPost, putWithoutConfig } from 'src/utils/network/networking';
import { httpGet, httpPut } from 'src/utils/network/sharedNetworking';
import {
  applicationLanguagesUrl,
  applicationMetadataApiUrl,
  applicationSettingsApiUrl,
  appPath,
  getActionsUrl,
  getActiveInstancesUrl,
  getCreateInstancesUrl,
  getCustomValidationConfigUrl,
  getDataElementIdUrl,
  getDataElementUrl,
  getDataModelTypeUrl,
  getDataValidationUrl,
  getFetchFormDynamicsUrl,
  getFileTagUrl,
  getFileUploadUrl,
  getFileUploadUrlOld,
  getFooterLayoutUrl,
  getInstantiateUrl,
  getJsonSchemaUrl,
  getLayoutSetsUrl,
  getLayoutSettingsUrl,
  getLayoutsUrl,
  getOrderDetailsUrl,
  getPaymentInformationUrl,
  getPdfFormatUrl,
  getProcessNextUrl,
  getProcessStateUrl,
  getRedirectUrl,
  getRulehandlerUrl,
  getSetSelectedPartyUrl,
  getUpdateFileTagsUrl,
  getValidationUrl,
  instancesControllerUrl,
  profileApiUrl,
  refreshJwtTokenUrl,
  selectedPartyUrl,
  textResourcesUrl,
  validPartiesUrl,
} from 'src/utils/urls/appUrlHelper';
import { customEncodeURI, orgsListUrl } from 'src/utils/urls/urlHelper';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { DataPostResponse } from 'src/features/attachments';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IFormDynamics } from 'src/features/form/dynamics';
import type {
  IDataModelMultiPatchRequest,
  IDataModelMultiPatchResponse,
  IDataModelPatchRequest,
  IDataModelPatchResponse,
} from 'src/features/formData/types';
import type { Instantiation } from 'src/features/instantiate/useInstantiation';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { OrderDetails, PaymentResponsePayload } from 'src/features/payment/types';
import type { IPdfFormat } from 'src/features/pdf/types';
import type {
  BackendValidationIssue,
  BackendValidationIssuesWithSource,
  IExpressionValidationConfig,
} from 'src/features/validation';
import type { ILayoutSets, ILayoutSettings, IRawOption } from 'src/layout/common.generated';
import type { ActionResult } from 'src/layout/CustomButton/CustomButtonComponent';
import type { ILayoutCollection } from 'src/layout/layout';
import type { ISimpleInstance, LooseAutocomplete } from 'src/types';
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

export const doSetSelectedParty = (partyId: number | string) =>
  putWithoutConfig<LooseAutocomplete<'Party successfully updated'> | null>(getSetSelectedPartyUrl(partyId));

export const doInstantiateWithPrefill = async (data: Instantiation, language?: string): Promise<IInstance> =>
  removeProcessFromInstance((await httpPost<IInstance>(getInstantiateUrl(language), undefined, data)).data);

export const doInstantiate = async (partyId: number, language?: string): Promise<IInstance> =>
  removeProcessFromInstance((await httpPost<IInstance>(getCreateInstancesUrl(partyId, language))).data);

export const doProcessNext = async (instanceId: string, language?: string, action?: IActionType) =>
  httpPut<IProcess>(getProcessNextUrl(instanceId, language), action ? { action } : null);

export const doAttachmentUploadOld = async (instanceId: string, dataTypeId: string, file: File): Promise<IData> => {
  const url = getFileUploadUrlOld(instanceId, dataTypeId);
  const contentType = getFileContentType(file);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${customEncodeURI(file.name)}`,
    },
  };

  return (await httpPost<IData>(url, config, file)).data;
};

export const doAttachmentUpload = async (
  instanceId: string,
  dataTypeId: string,
  language: string,
  file: File,
): Promise<DataPostResponse> => {
  const url = getFileUploadUrl(instanceId, dataTypeId, language);
  const contentType = getFileContentType(file);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${customEncodeURI(file.name)}`,
    },
  };

  return (await httpPost<DataPostResponse>(url, config, file)).data;
};

export const doAttachmentRemoveTag = async (
  instanceId: string,
  dataElementId: string,
  tagToRemove: string,
): Promise<void> => {
  await httpDelete(getFileTagUrl(instanceId, dataElementId, tagToRemove));
};

export const doAttachmentAddTag = async (
  instanceId: string,
  dataElementId: string,
  tagToAdd: string,
): Promise<void> => {
  const response = await httpPost(
    getFileTagUrl(instanceId, dataElementId, undefined),
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

  return;
};

export type SetTagsRequest = {
  tags: string[];
};

type UpdateTagsResponse = {
  tags: string[];
  validationIssues?: BackendValidationIssuesWithSource[];
};

export const doUpdateAttachmentTags = async ({
  instanceId,
  dataElementId,
  setTagsRequest,
}: {
  instanceId: string;
  dataElementId: string;
  setTagsRequest: SetTagsRequest;
}) => {
  const url = getUpdateFileTagsUrl(instanceId, dataElementId);
  const response = await httpPut<UpdateTagsResponse, SetTagsRequest>(url, setTagsRequest, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 200) {
    throw new Error('Failed to update tags on attachment');
  }

  return response.data;
};

type UserActionRequest = {
  action?: string;
  buttonId?: string;
  metadata?: Record<string, string>;
  ignoredValidators?: string[];
  onBehalfOf?: string;
};

export const doPerformAction = async (
  partyId: string,
  instanceGuid: string,
  actionRequest: UserActionRequest,
  language: string,
  queryClient: QueryClient,
): Promise<ActionResult> => {
  const response = await httpPost<ActionResult>(
    getActionsUrl(partyId, instanceGuid, language),
    undefined,
    actionRequest,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to perform action');
  }

  if (actionRequest.action === 'sign') {
    queryClient.invalidateQueries({ queryKey: signingQueries.all });
  }
  return response.data;
};

export const doAttachmentRemove = async (
  instanceId: string,
  dataElementId: string,
  language: string,
): Promise<void> => {
  const response = await httpDelete(getDataElementUrl(instanceId, dataElementId, language));
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to remove attachment');
  }
};

export const doSubformEntryAdd = async (instanceId: string, dataType: string, data: unknown): Promise<IData> => {
  const response = await httpPost<IData>(getDataModelTypeUrl(instanceId, dataType), undefined, data);
  if (response.status >= 300) {
    throw new Error('Failed to add sub form');
  }
  return response.data;
};

export const doSubformEntryDelete = async (instanceId: string, dataElementId: string): Promise<void> => {
  const response = await httpDelete(getDataElementIdUrl(instanceId, dataElementId));
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to delete sub form');
  }
};

// When saving data for normal/stateful apps
export const doPatchFormData = (url: string, data: IDataModelPatchRequest) =>
  httpPatch<IDataModelPatchResponse>(url, data);

// New multi-patch endpoint for stateful apps
export const doPatchMultipleFormData = (url: string, data: IDataModelMultiPatchRequest) =>
  httpPatch<IDataModelMultiPatchResponse>(url, data);

// When saving data for stateless apps
export const doPostStatelessFormData = async (
  url: string,
  data: object,
  options?: AxiosRequestConfig,
): Promise<object> => (await httpPost<object>(url, options, data)).data;

/**
 * Query functions (these should use httpGet and start with 'fetch')
 */

export const fetchLogo = async (): Promise<string> =>
  (await axios.get('https://altinncdn.no/img/Altinn-logo-blue.svg')).data;

export const fetchActiveInstances = (partyId: number): Promise<ISimpleInstance[]> =>
  httpGet(getActiveInstancesUrl(partyId));

export const fetchInstanceData = async (partyId: string, instanceGuid: string): Promise<IInstance> =>
  removeProcessFromInstance(
    await httpGet<IInstance & { process: unknown }>(`${instancesControllerUrl}/${partyId}/${instanceGuid}`),
  );

export const fetchProcessState = (instanceId: string): Promise<IProcess> => httpGet(getProcessStateUrl(instanceId));

export const fetchApplicationMetadata = () => httpGet<IncomingApplicationMetadata>(applicationMetadataApiUrl);

export const fetchApplicationSettings = (): Promise<IApplicationSettings> => httpGet(applicationSettingsApiUrl);

export const fetchSelectedParty = (): Promise<IParty | undefined> => httpGet(selectedPartyUrl);

export const fetchFooterLayout = (): Promise<IFooterLayout | null> => httpGet(getFooterLayoutUrl());

export const fetchLayoutSets = (): Promise<ILayoutSets> => httpGet(getLayoutSetsUrl());

export const fetchLayouts = (layoutSetId: string): Promise<ILayoutCollection> => httpGet(getLayoutsUrl(layoutSetId));

export const fetchLayoutSettings = (layoutSetId: string): Promise<ILayoutSettings> =>
  httpGet(getLayoutSettingsUrl(layoutSetId));

export const fetchOptions = (url: string): Promise<AxiosResponse<IRawOption[]> | null> => httpGetRaw<IRawOption[]>(url);

export const fetchDataList = (url: string): Promise<IDataList> => httpGet(url);

export const fetchOrgs = (): Promise<{ orgs: IAltinnOrgs }> =>
  httpGet(orgsListUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

export const fetchPartiesAllowedToInstantiate = (): Promise<IParty[]> => httpGet(validPartiesUrl);

export const fetchAppLanguages = (): Promise<IAppLanguage[]> => httpGet(applicationLanguagesUrl);

export const fetchReturnUrl = (queryParameterReturnUrl: string): Promise<string> =>
  httpGet(getRedirectUrl(queryParameterReturnUrl));

export const fetchRefreshJwtToken = (): Promise<unknown> => httpGet(refreshJwtTokenUrl);

export const fetchCustomValidationConfig = (dataTypeId: string): Promise<IExpressionValidationConfig | null> =>
  httpGet(getCustomValidationConfigUrl(dataTypeId));

export const fetchUserProfile = (): Promise<IProfile> => httpGet(profileApiUrl);

export const fetchDataModelSchema = (dataTypeName: string): Promise<JSONSchema7> =>
  httpGet(getJsonSchemaUrl() + dataTypeName);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchFormData = (url: string, options?: AxiosRequestConfig): Promise<any> => httpGet(url, options);

export const fetchPdfFormat = (instanceId: string, dataElementId: string): Promise<IPdfFormat> =>
  httpGet(getPdfFormatUrl(instanceId, dataElementId));

export const fetchDynamics = (layoutSetId: string): Promise<{ data: IFormDynamics } | null> =>
  httpGet(getFetchFormDynamicsUrl(layoutSetId));

export const fetchRuleHandler = (layoutSetId: string): Promise<string | null> =>
  httpGet(getRulehandlerUrl(layoutSetId));

export const fetchTextResources = (selectedLanguage: string): Promise<ITextResourceResult> =>
  httpGet(textResourcesUrl(selectedLanguage));

export const fetchPaymentInformation = (instanceId: string, language?: string): Promise<PaymentResponsePayload> =>
  httpGet(getPaymentInformationUrl(instanceId, language));

export const fetchOrderDetails = (instanceId: string, language?: string): Promise<OrderDetails> =>
  httpGet(getOrderDetailsUrl(instanceId, language));

export const fetchBackendValidations = (
  instanceId: string,
  language: string,
  onlyIncrementalValidators?: boolean,
): Promise<BackendValidationIssue[]> => httpGet(getValidationUrl(instanceId, language, onlyIncrementalValidators));

export const fetchBackendValidationsForDataElement = (
  instanceId: string,
  currentDataElementID: string,
  language: string,
): Promise<BackendValidationIssue[]> => httpGet(getDataValidationUrl(instanceId, currentDataElementID, language));

export const fetchLayoutSchema = async (): Promise<JSONSchema7 | undefined> => {
  // Hacky (and only) way to get the correct CDN url
  const schemaBaseUrl = document
    .querySelector('script[src$="altinn-app-frontend.js"]')
    ?.getAttribute('src')
    ?.replace('altinn-app-frontend.js', 'schemas/json/layout/');

  if (!schemaBaseUrl) {
    return Promise.resolve(undefined);
  }

  return (await axios.get(`${schemaBaseUrl}${LAYOUT_SCHEMA_NAME}`)).data ?? undefined;
};

export const fetchPostPlace = (zipCode: string): Promise<{ result: string; valid: boolean }> =>
  httpGet('https://api.bring.com/shippingguide/api/postalCode.json', {
    params: {
      clientUrl: window.location.href,
      pnr: zipCode,
    },
  });

export function fetchExternalApi({
  instanceId,
  externalApiId,
}: {
  instanceId: string;
  externalApiId: string;
}): Promise<unknown> {
  const externalApiUrl = `${appPath}/instances/${instanceId}/api/external/${externalApiId}`;
  return httpGet(externalApiUrl);
}
