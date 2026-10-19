import axios from 'axios';
import type { IRawOption } from '@app/layout-contract/generated/common.generated';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { LAYOUT_SCHEMA_NAME } from 'src/features/devtools/utils/layoutSchemaValidation';
import { GlobalData } from 'src/GlobalData';
import { getFileContentType } from 'src/utils/attachmentsUtils';
import { httpDelete, httpGetRaw, httpPatch, httpPost } from 'src/utils/network/networking';
import { httpGet, httpPut } from 'src/utils/network/sharedNetworking';
import {
  appPath,
  getActionsUrl,
  getDataElementIdUrl,
  getDataElementUrl,
  getDataModelTypeUrl,
  getFileUploadUrl,
  getFormBootstrapUrlForInstance,
  getFormBootstrapUrlForStateless,
  getOrderDetailsUrl,
  getPaymentInformationForTaskUrl,
  getProcessNextUrl,
  getProcessResumeUrl,
  getUpdateFileTagsUrl,
  refreshJwtTokenUrl,
} from 'src/utils/urls/appUrlHelper';
import { customEncodeURI } from 'src/utils/urls/urlHelper';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { DataPostResponse } from 'src/features/attachments';
import type { IDataList } from 'src/features/dataLists';
import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import type { IDataModelMultiPatchRequest, IDataModelMultiPatchResponse } from 'src/features/formData/types';
import type { OrderDetails, PaymentResponsePayload } from 'src/features/payment/types';
import type { BackendValidationIssuesWithSource } from 'src/features/validation';
import type { ActionResult } from 'src/layout/CustomButton/CustomButtonComponent';
import type { IActionType, IData, IProcess, PostalCodesRegistry } from 'src/types/shared';

const doProcessNext = async (instanceId: string, language?: string, action?: IActionType) =>
  httpPut<IInstanceWithProcess>(getProcessNextUrl(instanceId, language, true), action ? { action } : null);

const doProcessResume = async (instanceId: string) => httpPost<IProcess>(getProcessResumeUrl(instanceId));

const doAttachmentUpload = async (
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

export type SetTagsRequest = {
  tags: string[];
};

type UpdateTagsResponse = {
  tags: string[];
  validationIssues?: BackendValidationIssuesWithSource[];
};

const doUpdateAttachmentTags = async ({
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

const doPerformAction = async (
  partyId: string,
  instanceGuid: string,
  actionRequest: UserActionRequest,
  language: string,
): Promise<ActionResult> => {
  const response = await httpPost<ActionResult>(
    getActionsUrl(partyId, instanceGuid, language),
    undefined,
    actionRequest,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to perform action');
  }

  return response.data;
};

const doAttachmentRemove = async (instanceId: string, dataElementId: string, language: string): Promise<void> => {
  const response = await httpDelete(getDataElementUrl(instanceId, dataElementId, language));
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to remove attachment');
  }
};

const doSubformEntryAdd = async (instanceId: string, dataType: string, data: unknown): Promise<IData> => {
  const response = await httpPost<DataPostResponse>(getDataModelTypeUrl(instanceId, dataType), undefined, data);
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to add sub form');
  }
  const newDataElement = response.data.instance.data.find((element) => element.id === response.data.newDataElementId);
  if (!newDataElement) {
    throw new Error('Created subform data element is missing from the instance');
  }
  return newDataElement;
};

const doSubformEntryDelete = async (instanceId: string, dataElementId: string): Promise<void> => {
  const response = await httpDelete(getDataElementIdUrl(instanceId, dataElementId));
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to delete sub form');
  }
};

// New multi-patch endpoint for stateful apps
const doPatchMultipleFormData = (url: string, data: IDataModelMultiPatchRequest) =>
  httpPatch<IDataModelMultiPatchResponse>(url, data);

// When saving data for stateless apps
const doPostStatelessFormData = async (url: string, data: object, options?: AxiosRequestConfig): Promise<object> =>
  (await httpPost<object>(url, options, data)).data;

const fetchLogo = async (): Promise<string> =>
  (await axios.get(GlobalData.platformFrontendSettings.altinnLogoUrl)).data;

export type OptionsResponse = Pick<AxiosResponse<IRawOption[]>, 'data' | 'headers'>;

const fetchOptions = (url: string): Promise<OptionsResponse | null> => httpGetRaw<IRawOption[]>(url);

const fetchDataList = (url: string): Promise<IDataList> => httpGet(url);

const fetchRefreshJwtToken = (): Promise<unknown> => httpGet(refreshJwtTokenUrl);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchFormData = (url: string, options?: AxiosRequestConfig): Promise<any> => httpGet(url, options);

const fetchPaymentInformationForTask = (
  instanceId: string,
  language?: string,
  taskId?: string,
): Promise<PaymentResponsePayload> => httpGet(getPaymentInformationForTaskUrl(instanceId, language, taskId));

const fetchOrderDetails = (instanceId: string, language?: string): Promise<OrderDetails> =>
  httpGet(getOrderDetailsUrl(instanceId, language));

const fetchLayoutSchema = async (): Promise<JSONSchema7 | null> => {
  // Hacky (and only) way to get the correct CDN url
  const schemaBaseUrl = document
    .querySelector('script[src$="altinn-app-frontend.js"]')
    ?.getAttribute('src')
    ?.replace('altinn-app-frontend.js', 'schemas/json/layout/');

  if (!schemaBaseUrl) {
    return Promise.resolve(null);
  }

  return (await axios.get(`${schemaBaseUrl}${LAYOUT_SCHEMA_NAME}`)).data ?? null;
};

function fetchExternalApi({
  instanceId,
  externalApiId,
}: {
  instanceId: string;
  externalApiId: string;
}): Promise<unknown> {
  const externalApiUrl = `${appPath}/instances/${instanceId}/api/external/${externalApiId}`;
  return httpGet(externalApiUrl);
}

const fetchPostalCodes = async (): Promise<PostalCodesRegistry> => {
  const postalCodesUrl: string = GlobalData.platformFrontendSettings.postalCodesUrl;
  return (await axios.get(postalCodesUrl)).data;
};

const fetchFormBootstrapForInstance = (options: {
  instanceId: string;
  uiFolder: string;
  dataElementId?: string;
  pdf?: boolean;
  language?: string;
}): Promise<FormBootstrapResponse> => {
  const url = getFormBootstrapUrlForInstance(options);
  return httpGet<FormBootstrapResponse>(url);
};

const fetchFormBootstrapForStateless = (options: {
  uiFolder: string;
  language?: string;
  prefill?: string;
}): Promise<FormBootstrapResponse> => {
  const url = getFormBootstrapUrlForStateless(options);
  return httpGet<FormBootstrapResponse>(url);
};

export const processApi = { doProcessNext, doProcessResume };
export type ProcessApi = typeof processApi;

export const attachmentsApi = { doAttachmentUpload, doUpdateAttachmentTags, doAttachmentRemove };
export type AttachmentsApi = typeof attachmentsApi;

export const actionsApi = { doPerformAction };
export type ActionsApi = typeof actionsApi;

export const subformApi = { doSubformEntryAdd, doSubformEntryDelete };
export type SubformApi = typeof subformApi;

export const formDataApi = { doPatchMultipleFormData, doPostStatelessFormData, fetchFormData };
export type FormDataApi = typeof formDataApi;

export const resourcesApi = { fetchLogo, fetchLayoutSchema, fetchPostalCodes };
export type ResourcesApi = typeof resourcesApi;

export const authApi = { fetchRefreshJwtToken };
export type AuthApi = typeof authApi;

export const optionsApi = { fetchOptions };
export type OptionsApi = typeof optionsApi;

export const dataListsApi = { fetchDataList };
export type DataListsApi = typeof dataListsApi;

export const paymentApi = { fetchPaymentInformationForTask, fetchOrderDetails };
export type PaymentApi = typeof paymentApi;

export const formBootstrapApi = { fetchFormBootstrapForInstance, fetchFormBootstrapForStateless };
export type FormBootstrapApi = typeof formBootstrapApi;

export const externalApi = { fetchExternalApi };
export type ExternalApiClient = typeof externalApi;
