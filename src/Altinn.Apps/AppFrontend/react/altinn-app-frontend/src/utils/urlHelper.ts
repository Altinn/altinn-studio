import { IAltinnWindow } from 'src/types';

const altinnWindow = window as Window as IAltinnWindow;
const { org, app, reportee } = altinnWindow;
const origin = window.location.origin;

export const appPath = `${origin}/${org}/${app}`;
export const verifySubscriptionUrl = `${origin}/api/v1/${org}/${app}/verifySubscription?partyId=${reportee}`;
export const languageUrl = `${appPath}/api/Language/GetLanguageAsJSON`;
export const profileApiUrl = `${appPath}/api/v1/profile/user`;
export const applicationMetadataApiUrl = `${appPath}/api/v1/applicationmetadata`;
export const textResourcesUrl = `${origin}/${org}/${app}/api/textresources`;
export const updateCookieUrl: (partyId: string) => string = (partyId: string) => `
  ${appPath}/api/v1/parties/${partyId}
`;
export const invalidateCookieUrl:string = `${appPath}/api/authentication/invalidatecookie`;
export const validPartiesUrl: string =
  `${appPath}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const allPartiesUrl: string =
`${appPath}/api/v1/parties?allowedtoinstantiatefilter=false`;
export const instantiateUrl: string = `${appPath}/instances`;
export const currentPartyUrl: string = `${appPath}/api/authorization/parties/current?returnPartyObject=true`;
export const currentPartyIdUrl: string = `${appPath}/api/authorization/parties/current`;
export const instancesControllerUrl: string = `${appPath}/instances`;
export const partySelectionUrl: string = `${appPath}/#/partyselection`;
export const refreshJwtTokenUrl: string = `${appPath}/api/authentication/keepAlive`;
export const reactErrorPage: string = `${appPath}/#/error`;

export function fileUploadUrl(attachmentType: string, attachmentName: string) {
  return `${appPath}/instances/` +
  `${altinnWindow.instanceId}/data?dataType=${attachmentType}`;
}

export function dataElementUrl(dataGuid: string) {
  return `${appPath}/instances/${altinnWindow.instanceId}/data/${dataGuid}`;
}

export function getProcessStateUrl() {
  return `${appPath}/instances/${altinnWindow.instanceId}/process`;
}

export function getStartProcessUrl(instanceId?: string) {
  if (!instanceId) {
    instanceId = altinnWindow.instanceId;
  }
  return `${appPath}/instances/${instanceId}/process/start`;
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

export function getCompleteProcessUrl() {
 return `${appPath}/instances/${altinnWindow.instanceId}/process/next`;
}

export function getUpgradeAuthLevelUrl(reqAuthLevel: string) {
  return `https://${getHostname()}/ui/authentication/upgrade?goTo=${encodeURIComponent(appPath)}&reqAuthLevel=${reqAuthLevel}`;
}

export const getEnvironmentLoginUrl: () => string = () => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  const encodedGoToUrl = encodeURIComponent(window.location.href);
  if (domainSplitted.length === 5) {
    return `https://platform.${domainSplitted[2]}.${domainSplitted[3]}.${domainSplitted[4]}` +
      `/authentication/api/v1/authentication?goto=${encodedGoToUrl}`;
  } else if (domainSplitted.length === 4) {
    return `https://platform${domainSplitted[2]}.${domainSplitted[3]}` +
      `/authentication/api/v1/authentication?goto=${encodedGoToUrl}`;
  } else {
    // TODO: what if altinn3?
    throw new Error('Unknown domain');
  }
};

export const getHostname: () => string = () => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  if (domainSplitted.length === 5) {
    return `${domainSplitted[2]}.${domainSplitted[3]}.${domainSplitted[4]}`;
  } else if (domainSplitted.length === 4) {
    return `${domainSplitted[2]}.${domainSplitted[3]}`;
  } else if (domainSplitted.length === 2 && domainSplitted[0] === "altinn3local") {
    // Local test
    return window.location.host;
  } else {
    throw new Error('Unknown domain');
  }
};

export const redirectToUpgrade = (reqAuthLevel: string) =>{
  window.location.href = getUpgradeAuthLevelUrl(reqAuthLevel);
}
