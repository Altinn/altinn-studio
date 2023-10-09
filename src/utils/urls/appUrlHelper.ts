import type { SortDirection } from '@digdir/design-system-react';

import { mapFormData } from 'src/utils/databindings';
import { getQueryStringFromObject } from 'src/utils/urls/urlHelper';
import type { IFormData } from 'src/features/formData';
import type { IMapping } from 'src/layout/common.generated';

const { org, app } = window;
const origin = window.location.origin;

export const appPath = `${origin}/${org}/${app}`;
export const profileApiUrl = `${appPath}/api/v1/profile/user`;
export const oldTextResourcesUrl = `${origin}/${org}/${app}/api/textresources`;
export const applicationMetadataApiUrl = `${appPath}/api/v1/applicationmetadata`;
export const applicationSettingsApiUrl = `${appPath}/api/v1/applicationsettings`;
export const invalidateCookieUrl = `${appPath}/api/authentication/invalidatecookie`;
export const validPartiesUrl = `${appPath}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const currentPartyUrl = `${appPath}/api/authorization/parties/current?returnPartyObject=true`;
export const instancesControllerUrl = `${appPath}/instances`;
export const refreshJwtTokenUrl = `${appPath}/api/authentication/keepAlive`;

export const updateCookieUrl = (partyId: string) => `${appPath}/api/v1/parties/${partyId}`;

export const textResourcesUrl = (language: string) => `${origin}/${org}/${app}/api/v1/texts/${language}`;

export const fileUploadUrl = (attachmentType: string) =>
  `${appPath}/instances/${window.instanceId}/data?dataType=${attachmentType}`;

export const fileTagUrl = (dataGuid: string) => `${appPath}/instances/${window.instanceId}/data/${dataGuid}/tags`;

export const dataElementUrl = (dataGuid: string) => `${appPath}/instances/${window.instanceId}/data/${dataGuid}`;

export const getProcessStateUrl = () => `${appPath}/instances/${window.instanceId}/process`;

export const getCreateInstancesUrl = (partyId: string) => `${appPath}/instances?instanceOwnerPartyId=${partyId}`;

export const getValidationUrl = (instanceId: string) => `${appPath}/instances/${instanceId}/validate`;

export const getDataValidationUrl = (instanceId: string, dataGuid: string) =>
  `${appPath}/instances/${instanceId}/data/${dataGuid}/validate`;

export const getPdfFormatUrl = (instanceId: string, dataGuid: string) =>
  `${appPath}/instances/${instanceId}/data/${dataGuid}/pdf/format`;

export const getProcessNextUrl = (taskId?: string | null, language?: string | null) => {
  const queryString = getQueryStringFromObject({
    elementId: taskId,
    lang: language,
  });

  return `${appPath}/instances/${window.instanceId}/process/next${queryString}`;
};

export const getRedirectUrl = (returnUrl: string) => `${appPath}/api/v1/redirect?url=${encodeURIComponent(returnUrl)}`;

export const getUpgradeAuthLevelUrl = (reqAuthLevel: string) => {
  const redirect: string =
    `https://platform.${getHostname()}` + `/authentication/api/v1/authentication?goto=${appPath}`;
  return `https://${getHostname()}/ui/authentication/upgrade?goTo=${encodeURIComponent(
    redirect,
  )}&reqAuthLevel=${reqAuthLevel}`;
};

export const getEnvironmentLoginUrl = (oidcProvider: string | null) => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  const encodedGoToUrl = encodeURIComponent(window.location.href);
  let issParam = '';
  if (oidcProvider != null && oidcProvider != '') {
    issParam = `&iss=${oidcProvider}`;
  }

  if (domainSplitted.length === 5) {
    return (
      `https://platform.${domainSplitted[2]}.${domainSplitted[3]}.${domainSplitted[4]}` +
      `/authentication/api/v1/authentication?goto=${encodedGoToUrl}${issParam}`
    );
  }

  if (domainSplitted.length === 4) {
    return (
      `https://platform.${domainSplitted[2]}.${domainSplitted[3]}` +
      `/authentication/api/v1/authentication?goto=${encodedGoToUrl}${issParam}`
    );
  }

  // TODO: what if altinn3?
  throw new Error('Unknown domain');
};

export const getHostname = () => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  if (domainSplitted.length === 5) {
    return `${domainSplitted[2]}.${domainSplitted[3]}.${domainSplitted[4]}`;
  }
  if (domainSplitted.length === 4) {
    return `${domainSplitted[2]}.${domainSplitted[3]}`;
  }
  if (domainSplitted[0] === 'altinn3local' || domainSplitted[0] === 'local') {
    // Local test, needs to be backward compat with users who uses old local test
    return window.location.host;
  }
  throw new Error('Unknown domain');
};

export const redirectToUpgrade = (reqAuthLevel: string) => {
  window.location.href = getUpgradeAuthLevelUrl(reqAuthLevel);
};

export const getJsonSchemaUrl = () => `${appPath}/api/jsonschema/`;
export const getDataModelMetaDataUrl = () => `${appPath}/api/metadata/`;

export const getCustomValidationConfigUrl = (dataTypeId: string) => `${appPath}/api/validationconfig/${dataTypeId}`;

export const getLayoutSettingsUrl = (layoutset: string | null | undefined) => {
  if (layoutset === null || layoutset === undefined) {
    return `${appPath}/api/layoutsettings`;
  }
  return `${appPath}/api/layoutsettings/${layoutset}`;
};

export const getLayoutSetsUrl = () => `${appPath}/api/layoutsets`;
export const getFooterLayoutUrl = () => `${appPath}/api/v1/footer`;

export const getFetchFormDataUrl = (instanceId: string, dataElementId: string) =>
  `${appPath}/instances/${instanceId}/data/${dataElementId}`;

export const getStatelessFormDataUrl = (dataType: string, anonymous = false) => {
  if (anonymous) {
    return `${appPath}/v1/data/anonymous?dataType=${dataType}`;
  }
  return `${appPath}/v1/data?dataType=${dataType}`;
};

export const getFetchFormDynamicsUrl = (layoutSetId?: string) => {
  if (layoutSetId) {
    return `${appPath}/api/ruleconfiguration/${layoutSetId}`;
  }
  return `${appPath}/api/resource/RuleConfiguration.json`;
};

export const getLayoutsUrl = (layoutset: string | null) => {
  if (layoutset === null) {
    return `${appPath}/api/resource/FormLayout.json`;
  }
  return `${appPath}/api/layouts/${layoutset}`;
};

export const getRulehandlerUrl = (layoutset?: string) => {
  if (!layoutset) {
    return `${appPath}/api/resource/RuleHandler.js`;
  }
  return `${appPath}/api/rulehandler/${layoutset}`;
};

export const getCalculatePageOrderUrl = (stateless: boolean) => {
  if (stateless) {
    return `${appPath}/v1/pages/order`;
  } else {
    return `${appPath}/instances/${window.instanceId}/pages/order`;
  }
};

export const getPartyValidationUrl = (partyId: string) =>
  `${appPath}/api/v1/parties/validateInstantiation?partyId=${partyId}`;

export const getActiveInstancesUrl = (partyId: string) => `${appPath}/instances/${partyId}/active`;

export const getInstanceUiUrl = (instanceId: string) => `${appPath}#/instance/${instanceId}`;

export const appFrontendCDNPath = 'https://altinncdn.no/toolkits/altinn-app-frontend';
export const frontendVersionsCDN = `${appFrontendCDNPath}/index.json`;

export interface IGetOptionsUrlParams {
  optionsId: string;
  dataMapping?: IMapping;
  fixedQueryParameters?: Record<string, string>;
  formData?: IFormData;
  language?: string;
  secure?: boolean;
  instanceId?: string;
}

export const getOptionsUrl = ({
  optionsId,
  dataMapping,
  fixedQueryParameters,
  formData,
  language,
  secure,
  instanceId,
}: IGetOptionsUrlParams) => {
  let url: URL;
  if (secure) {
    url = new URL(`${appPath}/instances/${instanceId}/options/${optionsId}`);
  } else {
    url = new URL(`${appPath}/api/options/${optionsId}`);
  }

  const params: Record<string, string> = {};

  if (language) {
    params.language = language;
  }
  if (fixedQueryParameters) {
    Object.assign(params, fixedQueryParameters);
  }
  if (formData && dataMapping) {
    const mapped = mapFormData(formData, dataMapping);
    Object.assign(params, mapped);
  }

  url.search = new URLSearchParams(params).toString();
  return url.toString();
};
export interface IGetDataListsUrlParams {
  dataListId: string;
  mappedData?: Record<string, any>;
  language?: string;
  secure?: boolean;
  instanceId?: string;
  pageSize?: string;
  pageNumber?: string;
  sortDirection?: SortDirection;
  sortColumn?: string | null;
}

export const getDataListsUrl = ({
  dataListId,
  mappedData,
  language,
  pageSize,
  pageNumber,
  sortDirection,
  sortColumn,
  secure,
  instanceId,
}: IGetDataListsUrlParams) => {
  let url: URL;
  if (secure) {
    url = new URL(`${appPath}/instances/${instanceId}/datalists/${dataListId}`);
  } else {
    url = new URL(`${appPath}/api/datalists/${dataListId}`);
  }
  let params: Record<string, string> = {};

  if (language) {
    params.language = language;
  }

  if (pageSize) {
    params.size = pageSize;
  }

  if (pageNumber !== undefined) {
    params.page = pageNumber;
  }

  if (sortColumn) {
    params.sortColumn = sortColumn;
  }

  if (sortDirection) {
    params.sortDirection = sortDirection;
  }

  if (mappedData) {
    params = {
      ...params,
      ...mappedData,
    };
  }

  url.search = new URLSearchParams(params).toString();
  return url.toString();
};
