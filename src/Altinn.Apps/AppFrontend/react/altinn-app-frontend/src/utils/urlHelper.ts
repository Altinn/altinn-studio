import { IAltinnWindow, IFetchSpecificOptionSaga } from 'src/types';
import { mapFormData } from 'src/utils/databindings';

const altinnWindow = window as Window as IAltinnWindow;
const { org, app, reportee } = altinnWindow;
const origin = window.location.origin;

export const appPath = `${origin}/${org}/${app}`;
export const verifySubscriptionUrl = `${origin}/api/v1/${org}/${app}/verifySubscription?partyId=${reportee}`;
export const languageUrl = `${appPath}/api/Language/GetLanguageAsJSON`;
export const profileApiUrl = `${appPath}/api/v1/profile/user`;
export const oldTextResourcesUrl = `${origin}/${org}/${app}/api/textresources`;
export const applicationMetadataApiUrl = `${appPath}/api/v1/applicationmetadata`;
export const applicationSettingsApiUrl = `${appPath}/api/v1/applicationsettings`;
export const updateCookieUrl: (partyId: string) => string = (
  partyId: string,
) => `
  ${appPath}/api/v1/parties/${partyId}
`;
export const invalidateCookieUrl = `${appPath}/api/authentication/invalidatecookie`;
export const validPartiesUrl = `${appPath}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const allPartiesUrl = `${appPath}/api/v1/parties?allowedtoinstantiatefilter=false`;
export const instantiateUrl = `${appPath}/instances`;
export const currentPartyUrl = `${appPath}/api/authorization/parties/current?returnPartyObject=true`;
export const currentPartyIdUrl = `${appPath}/api/authorization/parties/current`;
export const instancesControllerUrl = `${appPath}/instances`;
export const partySelectionUrl = `${appPath}/#/partyselection`;
export const refreshJwtTokenUrl = `${appPath}/api/authentication/keepAlive`;
export const reactErrorPage = `${appPath}/#/error`;

export function textResourcesUrl(language: string) {
  return `${origin}/${org}/${app}/api/v1/texts/${language}`;
}

export function fileUploadUrl(attachmentType: string) {
  return (
    `${appPath}/instances/` +
    `${altinnWindow.instanceId}/data?dataType=${attachmentType}`
  );
}

export function dataElementUrl(dataGuid: string) {
  return `${appPath}/instances/${altinnWindow.instanceId}/data/${dataGuid}`;
}

export function getProcessStateUrl() {
  return `${appPath}/instances/${altinnWindow.instanceId}/process`;
}

export function getStartProcessUrl(instanceId?: string) {
  return `${appPath}/instances/${
    instanceId || altinnWindow.instanceId
  }/process/start`;
}

export function getCreateInstancesUrl(partyId: string) {
  return `${appPath}/instances?instanceOwnerPartyId=${partyId}`;
}

export function getCreateDataElementUrl(instanceId: string, dataType: string) {
  return `${appPath}/instances/${instanceId}/data?dataType=${dataType}`;
}

export function getValidationUrl(instanceId: string) {
  return `${appPath}/instances/${instanceId}/validate`;
}

export function getDataValidationUrl(instanceId: string, dataGuid: string) {
  return `${appPath}/instances/${instanceId}/data/${dataGuid}/validate`;
}

export function getCompleteProcessUrl() {
  return `${appPath}/instances/${altinnWindow.instanceId}/process/next`;
}

export function getRedirectUrl(returnUrl: string) {
  return `${appPath}/api/v1/redirect?url=${encodeURIComponent(returnUrl)}`;
}

export function getUpgradeAuthLevelUrl(reqAuthLevel: string) {
  const redirect: string =
    `https://platform.${getHostname()}` +
    `/authentication/api/v1/authentication?goto=${appPath}`;
  return `https://${getHostname()}/ui/authentication/upgrade?goTo=${encodeURIComponent(
    redirect,
  )}&reqAuthLevel=${reqAuthLevel}`;
}

export const getEnvironmentLoginUrl = (oidcprovider: string) => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  const encodedGoToUrl = encodeURIComponent(window.location.href);
  let issParam = '';
  if (oidcprovider != null && oidcprovider != '') {
    issParam = `&iss=${oidcprovider}`;
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

export const getHostname: () => string = () => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  if (domainSplitted.length === 5) {
    return `${domainSplitted[2]}.${domainSplitted[3]}.${domainSplitted[4]}`;
  }
  if (domainSplitted.length === 4) {
    return `${domainSplitted[2]}.${domainSplitted[3]}`;
  }
  if (domainSplitted.length === 2 && domainSplitted[0] === 'altinn3local') {
    // Local test
    return window.location.host;
  }
  throw new Error('Unknown domain');
};

export const redirectToUpgrade = (reqAuthLevel: string) => {
  window.location.href = getUpgradeAuthLevelUrl(reqAuthLevel);
};

export function getJsonSchemaUrl() {
  return `${appPath}/api/jsonschema/`;
}

export function getLayoutSettingsUrl(layoutset: string) {
  if (layoutset === null) {
    return `${appPath}/api/layoutsettings`;
  }
  return `${appPath}/api/layoutsettings/${layoutset}`;
}

export function getLayoutSetsUrl() {
  return `${appPath}/api/layoutsets`;
}

export function getFetchFormDataUrl(instanceId: string, dataElementId: string) {
  return `${appPath}/instances/${instanceId}/data/${dataElementId}`;
}

export function getStatelessFormDataUrl(dataType: string) {
  return `${appPath}/v1/data?dataType=${dataType}`;
}

export function getFetchFormDynamicsUrl(layoutSetId?: string) {
  if (layoutSetId) {
    return `${appPath}/api/ruleconfiguration/${layoutSetId}`;
  }
  return `${appPath}/api/resource/RuleConfiguration.json`;
}

export function getLayoutsUrl(layoutset: string) {
  if (layoutset === null) {
    return `${appPath}/api/resource/FormLayout.json`;
  }
  return `${appPath}/api/layouts/${layoutset}`;
}

export function getRulehandlerUrl(layoutset: string) {
  if (layoutset === null) {
    return `${appPath}/api/resource/RuleHandler.js`;
  }
  return `${appPath}/api/rulehandler/${layoutset}`;
}

export function getCalculatePageOrderUrl() {
  return `${appPath}/instances/${altinnWindow.instanceId}/pages/order`;
}

export function getPartyValidationUrl(partyId: string) {
  return `${appPath}/api/v1/parties/validateInstantiation?partyId=${partyId}`;
}

export function getActiveInstancesUrl(partyId: string) {
  return `${appPath}/instances/${partyId}/active`;
}

export function getInstanceUiUrl(instanceId: string) {
  return `${appPath}#/instance/${instanceId}`;
}

export const getOptionsUrl = ({
  optionsId,
  formData,
  language,
  dataMapping,
}: IFetchSpecificOptionSaga) => {
  let url = `${appPath}/api/options/${optionsId}`;

  if (language || dataMapping) {
    url += '?';
  }

  if (language) {
    const languageParam = new URLSearchParams({
      language,
    });

    url += languageParam;
  }

  if (language && dataMapping) {
    url += '&';
  }

  if (dataMapping) {
    const mapped = mapFormData(formData, dataMapping);
    const queryParams = new URLSearchParams(mapped);

    url += queryParams;
  }

  return url;
};
