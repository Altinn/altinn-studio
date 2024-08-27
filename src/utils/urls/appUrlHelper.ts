import type { SortDirection } from '@digdir/design-system-react/dist/types/components/legacy/LegacyTable/utils';

import { getQueryStringFromObject } from 'src/utils/urls/urlHelper';

const { org, app } = window;
const origin = window.location.origin;

export const appPath = `${origin}/${org}/${app}`;
export const profileApiUrl = `${appPath}/api/v1/profile/user`;
export const applicationMetadataApiUrl = `${appPath}/api/v1/applicationmetadata`;
export const applicationSettingsApiUrl = `${appPath}/api/v1/applicationsettings`;
export const invalidateCookieUrl = `${appPath}/api/authentication/invalidatecookie`;
export const validPartiesUrl = `${appPath}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const currentPartyUrl = `${appPath}/api/authorization/parties/current?returnPartyObject=true`;
export const instancesControllerUrl = `${appPath}/instances`;
export const instantiateUrl = `${appPath}/instances/create`;
export const refreshJwtTokenUrl = `${appPath}/api/authentication/keepAlive`;
export const applicationLanguagesUrl = `${appPath}/api/v1/applicationlanguages`;

export const getSetCurrentPartyUrl = (partyId: number) => `${appPath}/api/v1/parties/${partyId}`;

export const textResourcesUrl = (language: string) => `${origin}/${org}/${app}/api/v1/texts/${language}`;

export const getPaymentInformationUrl = (instanceId: string, language?: string) => {
  const queryString = getQueryStringFromObject({ language });
  return `${origin}/${org}/${app}/instances/${instanceId}/payment${queryString}`;
};

export const getOrderDetailsUrl = (instanceId: string, language?: string) => {
  const queryString = getQueryStringFromObject({ language });
  return `${origin}/${org}/${app}/instances/${instanceId}/payment/order-details${queryString}`;
};
export const getFileUploadUrl = (instanceId: string, attachmentType: string) =>
  `${appPath}/instances/${instanceId}/data?dataType=${attachmentType}`;

export const getFileTagUrl = (instanceId: string, dataGuid: string, tag: string | undefined) => {
  if (tag) {
    return `${appPath}/instances/${instanceId}/data/${dataGuid}/tags/${tag}`;
  }

  return `${appPath}/instances/${instanceId}/data/${dataGuid}/tags`;
};

export const getAnonymousStatelessDataModelUrl = (dataType: string, includeRowIds: boolean) =>
  `${appPath}/v1/data/anonymous?dataType=${dataType}&includeRowId=${includeRowIds.toString()}`;
export const getStatelessDataModelUrl = (dataType: string, includeRowIds: boolean) =>
  `${appPath}/v1/data?dataType=${dataType}&includeRowId=${includeRowIds.toString()}`;
export const getDataModelUrl = (instanceId: string, dataGuid: string, includeRowIds: boolean) =>
  `${appPath}/instances/${instanceId}/data/${dataGuid}?includeRowId=${includeRowIds.toString()}`;

export const getDataElementUrl = (instanceId: string, dataGuid: string, language: string) =>
  `${appPath}/instances/${instanceId}/data/${dataGuid}?language=${language}`;

export const getProcessStateUrl = (instanceId: string) => `${appPath}/instances/${instanceId}/process`;
export const getActionsUrl = (partyId: string, instanceId: string, language?: string) => {
  const queryString = getQueryStringFromObject({ language });
  return `${appPath}/instances/${partyId}/${instanceId}/actions${queryString}`;
};

export const getCreateInstancesUrl = (partyId: number) => `${appPath}/instances?instanceOwnerPartyId=${partyId}`;

export const getValidationUrl = (instanceId: string) => `${appPath}/instances/${instanceId}/validate`;

export const getDataValidationUrl = (instanceId: string, dataGuid: string, language: string) => {
  const queryString = getQueryStringFromObject({ language });
  return `${appPath}/instances/${instanceId}/data/${dataGuid}/validate${queryString}`;
};

export const getPdfFormatUrl = (instanceId: string, dataGuid: string) =>
  `${appPath}/instances/${instanceId}/data/${dataGuid}/pdf/format`;

export const getPdfPreviewUrl = (instanceId: string, language: string) => {
  const queryString = getQueryStringFromObject({ language });
  return `${appPath}/instances/${instanceId}/pdf/preview${queryString}`;
};

export const getProcessNextUrl = (instanceId: string, language?: string) => {
  const queryString = getQueryStringFromObject({ language });
  return `${appPath}/instances/${instanceId}/process/next${queryString}`;
};

export const getRedirectUrl = (returnUrl: string) => {
  const encodedUriComponent = encodeURIComponent(returnUrl);

  return `${appPath}/api/v1/redirect?url=${encodedUriComponent}`;
};

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
export const getCustomValidationConfigUrl = (dataTypeId: string) => `${appPath}/api/validationconfig/${dataTypeId}`;
export const getLayoutSettingsUrl = (layoutSetId: string) => `${appPath}/api/layoutsettings/${layoutSetId}`;
export const getLayoutSetsUrl = () => `${appPath}/api/layoutsets`;
export const getFooterLayoutUrl = () => `${appPath}/api/v1/footer`;
export const getFetchFormDynamicsUrl = (layoutSetId: string) => `${appPath}/api/ruleconfiguration/${layoutSetId}`;
export const getLayoutsUrl = (layoutSetId: string) => `${appPath}/api/layouts/${layoutSetId}`;
export const getRulehandlerUrl = (layoutSet: string) => `${appPath}/api/rulehandler/${layoutSet}`;
export const getActiveInstancesUrl = (partyId: number) => `${appPath}/instances/${partyId}/active`;
export const getInstanceUiUrl = (instanceId: string) => `${appPath}#/instance/${instanceId}`;

export const appFrontendCDNPath = 'https://altinncdn.no/toolkits/altinn-app-frontend';
export const frontendVersionsCDN = `${appFrontendCDNPath}/index.json`;

export interface IGetOptionsUrlParams {
  optionsId: string;
  queryParameters?: Record<string, string>;
  language?: string;
  secure?: boolean;
  instanceId?: string;
}

export const getOptionsUrl = ({ optionsId, queryParameters, language, secure, instanceId }: IGetOptionsUrlParams) => {
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
  queryParameters && Object.assign(params, queryParameters);

  url.search = new URLSearchParams(params).toString();
  return url.toString();
};
export interface IGetDataListsUrlParams {
  dataListId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
