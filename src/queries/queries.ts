import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { LAYOUT_SCHEMA_NAME } from 'src/features/devtools/utils/layoutSchemaValidation';
import { httpDelete, httpGetRaw, httpPatch, httpPost, putWithoutConfig } from 'src/utils/network/networking';
import { httpGet, httpPut } from 'src/utils/network/sharedNetworking';
import {
  applicationLanguagesUrl,
  applicationMetadataApiUrl,
  applicationSettingsApiUrl,
  appPath,
  currentPartyUrl,
  getActionsUrl,
  getActiveInstancesUrl,
  getCreateInstancesUrl,
  getCustomValidationConfigUrl,
  getDataElementUrl,
  getDataValidationUrl,
  getFetchFormDynamicsUrl,
  getFileTagUrl,
  getFileUploadUrl,
  getFooterLayoutUrl,
  getJsonSchemaUrl,
  getLayoutSetsUrl,
  getLayoutSettingsUrl,
  getLayoutsUrl,
  getOrderDetailsUrl,
  getPaymentInformationUrl,
  getPdfFormatUrl,
  getProcessNextUrl,
  getProcessStateUrl,
  getRulehandlerUrl,
  getSetCurrentPartyUrl,
  instancesControllerUrl,
  instantiateUrl,
  profileApiUrl,
  refreshJwtTokenUrl,
  textResourcesUrl,
  validPartiesUrl,
} from 'src/utils/urls/appUrlHelper';
import { customEncodeURI, orgsListUrl } from 'src/utils/urls/urlHelper';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IFormDynamics } from 'src/features/form/dynamics';
import type { IDataModelPatchRequest, IDataModelPatchResponse } from 'src/features/formData/types';
import type { Instantiation } from 'src/features/instantiate/InstantiationContext';
import type { ITextResourceResult } from 'src/features/language/textResources';
import type { OrderDetails, PaymentResponsePayload } from 'src/features/payment/types';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { BackendValidationIssue, IExpressionValidationConfig } from 'src/features/validation';
import type { ILayoutSets, ILayoutSettings, IRawOption } from 'src/layout/common.generated';
import type { ActionResult } from 'src/layout/CustomButton/CustomButtonComponent';
import type { ILayoutCollection } from 'src/layout/layout';
import type { ISimpleInstance } from 'src/types';
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

export const doSetCurrentParty = (partyId: number) =>
  putWithoutConfig<'Party successfully updated' | string | null>(getSetCurrentPartyUrl(partyId));

export const doInstantiateWithPrefill = async (data: Instantiation): Promise<IInstance> =>
  cleanUpInstanceData((await httpPost(instantiateUrl, undefined, data)).data);

export const doInstantiate = async (partyId: number): Promise<IInstance> =>
  cleanUpInstanceData((await httpPost(getCreateInstancesUrl(partyId))).data);

export const doProcessNext = async (instanceId: string, language?: string, action?: IActionType) =>
  httpPut<IProcess>(getProcessNextUrl(instanceId, language), action ? { action } : null);

export const doAttachmentUpload = async (instanceId: string, dataTypeId: string, file: File): Promise<IData> => {
  const url = getFileUploadUrl(instanceId, dataTypeId);
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

export const doAttachmentRemoveTag = async (instanceId: string, dataGuid: string, tagToRemove: string): Promise<void> =>
  (await httpDelete(getFileTagUrl(instanceId, dataGuid, tagToRemove))).data;

export const doAttachmentAddTag = async (instanceId: string, dataGuid: string, tagToAdd: string): Promise<void> => {
  const response = await httpPost(
    getFileTagUrl(instanceId, dataGuid, undefined),
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

export const doPerformAction = async (
  partyId: string,
  dataGuid: string,
  data: unknown,
  language?: string,
): Promise<ActionResult> => {
  const response = await httpPost(getActionsUrl(partyId, dataGuid, language), undefined, data);
  if (response.status !== 200) {
    throw new Error('Failed to perform action');
  }
  return response.data;
};

export const doAttachmentRemove = async (instanceId: string, dataGuid: string, language: string): Promise<void> => {
  const response = await httpDelete(getDataElementUrl(instanceId, dataGuid, language));
  if (response.status !== 200) {
    throw new Error('Failed to remove attachment');
  }
  return response.data;
};

// When saving data for normal/stateful apps
export const doPatchFormData = (url: string, data: IDataModelPatchRequest) =>
  httpPatch<IDataModelPatchResponse>(url, data);

// When saving data for stateless apps
export const doPostStatelessFormData = async (url: string, data: object): Promise<object> =>
  (await httpPost(url, undefined, data)).data;

/**
 * Query functions (these should use httpGet and start with 'fetch')
 */

export const fetchLogo = async (): Promise<string> =>
  (await axios.get('https://altinncdn.no/img/Altinn-logo-blue.svg')).data;

export const fetchActiveInstances = (partyId: number): Promise<ISimpleInstance[]> =>
  httpGet(getActiveInstancesUrl(partyId));

export const fetchInstanceData = (partyId: string, instanceGuid: string): Promise<IInstance> =>
  cleanUpInstanceData(httpGet(`${instancesControllerUrl}/${partyId}/${instanceGuid}`));

export const fetchProcessState = (instanceId: string): Promise<IProcess> => httpGet(getProcessStateUrl(instanceId));

export const fetchProcessNextSteps = (instanceId: string): Promise<string[]> => httpGet(getProcessNextUrl(instanceId));

export const fetchApplicationMetadata = () => httpGet<IncomingApplicationMetadata>(applicationMetadataApiUrl);

export const fetchApplicationSettings = (): Promise<IApplicationSettings> => httpGet(applicationSettingsApiUrl);

export const fetchCurrentParty = (): Promise<IParty | undefined> => httpGet(currentPartyUrl);

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

export const fetchParties = (): Promise<IParty[]> => httpGet(validPartiesUrl);

export const fetchAppLanguages = (): Promise<IAppLanguage[]> => httpGet(applicationLanguagesUrl);

export const fetchRefreshJwtToken = (): Promise<unknown> => httpGet(refreshJwtTokenUrl);

export const fetchCustomValidationConfig = (dataTypeId: string): Promise<IExpressionValidationConfig | null> =>
  httpGet(getCustomValidationConfigUrl(dataTypeId));

export const fetchUserProfile = (): Promise<IProfile> => httpGet(profileApiUrl);

export const fetchDataModelSchema = (dataTypeName: string): Promise<JSONSchema7> =>
  httpGet(getJsonSchemaUrl() + dataTypeName);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchFormData = (url: string, options?: AxiosRequestConfig): Promise<any> => httpGet(url, options);

export const fetchPdfFormat = (instanceId: string, dataGuid: string): Promise<IPdfFormat> =>
  httpGet(getPdfFormatUrl(instanceId, dataGuid));

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
  currentDataElementId: string,
  language: string,
): Promise<BackendValidationIssue[]> => httpGet(getDataValidationUrl(instanceId, currentDataElementId, language));

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
