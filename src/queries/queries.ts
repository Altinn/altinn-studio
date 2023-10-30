import type { AxiosRequestConfig } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { LAYOUT_SCHEMA_NAME } from 'src/features/devtools/utils/layoutSchemaValidation';
import { httpPost, putWithoutConfig } from 'src/utils/network/networking';
import { httpGet } from 'src/utils/network/sharedNetworking';
import {
  applicationMetadataApiUrl,
  applicationSettingsApiUrl,
  currentPartyUrl,
  getActiveInstancesUrl,
  getCustomValidationConfigUrl,
  getFetchFormDynamicsUrl,
  getFooterLayoutUrl,
  getJsonSchemaUrl,
  getLayoutSetsUrl,
  getPartyValidationUrl,
  getPdfFormatUrl,
  getRulehandlerUrl,
  profileApiUrl,
  refreshJwtTokenUrl,
  textResourcesUrl,
  updateCookieUrl,
  validPartiesUrl,
} from 'src/utils/urls/appUrlHelper';
import { orgsListUrl } from 'src/utils/urls/urlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IDataList } from 'src/features/dataLists';
import type { IFormDynamics } from 'src/features/dynamics';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IPartyValidationResponse } from 'src/features/party';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { ITextResourceResult } from 'src/features/textResources';
import type { IOption } from 'src/layout/common.generated';
import type { ILayoutSets, ISimpleInstance } from 'src/types';
import type { IAltinnOrgs, IApplicationSettings, IParty, IProfile } from 'src/types/shared';
import type { IExpressionValidationConfig } from 'src/utils/validation/types';

export const doPartyValidation = async (partyId: string): Promise<IPartyValidationResponse> =>
  (await httpPost(getPartyValidationUrl(partyId))).data;

export const doSelectParty = (partyId: string) => putWithoutConfig<IParty | null>(updateCookieUrl(partyId));

export const fetchActiveInstances = (partyId: string): Promise<ISimpleInstance[]> =>
  httpGet(getActiveInstancesUrl(partyId));

export const fetchApplicationMetadata = (): Promise<IApplicationMetadata> => httpGet(applicationMetadataApiUrl);

export const fetchApplicationSettings = (): Promise<IApplicationSettings> => httpGet(applicationSettingsApiUrl);

export const fetchCurrentParty = () => httpGet(currentPartyUrl);

export const fetchFooterLayout = (): Promise<IFooterLayout> => httpGet(getFooterLayoutUrl());

export const fetchLayoutSets = (): Promise<ILayoutSets> => httpGet(getLayoutSetsUrl());

export const fetchOptions = (url: string): Promise<IOption[]> => httpGet(url);

export const fetchDataList = (url: string): Promise<IDataList> => httpGet(url);

export const fetchOrgs = (): Promise<{ orgs: IAltinnOrgs }> =>
  httpGet(orgsListUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

export const fetchParties = () => httpGet(validPartiesUrl);

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
