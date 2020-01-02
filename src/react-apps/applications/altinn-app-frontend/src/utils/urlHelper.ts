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
export const validPartiesUrl: string =
  `${appPath}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const allPartiesUrl: string =
`${appPath}/api/v1/parties?allowedtoinstantiatefilter=false`;
export const instantiateUrl: string = `${appPath}/instances`;
export const currentPartyUrl: string = `${appPath}/api/authorization/parties/current`;
export const instancesControllerUrl: string = `${appPath}/instances`;
export const partySelectionUrl: string = `${appPath}/#/partyselection`;
export const refreshJwtTokenUrl: string = `${appPath}/api/authentication/keepAlive`;
export const reactErrorPage: string = `${appPath}/#/error`;

export function fileUploadUrl(attachmentType: string, attachmentName: string) {
  return `${appPath}/instances/` +
  `${altinnWindow.instanceId}/data?dataType=${attachmentType}&attachmentName=${attachmentName}`;
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
 return `${appPath}/instances/${altinnWindow.instanceId}/process/completeProcess`;
}

export const getEnvironmentLoginUrl: () => string = () => {
  // First split away the protocol 'https://' and take the last part. Then split on dots.
  const domainSplitted: string[] = window.location.host.split('.');
  if (domainSplitted.length === 5) {
    return `https://platform.${domainSplitted[2]}.${domainSplitted[3]}.${domainSplitted[4]}` +
      `/authentication/api/v1/authentication?goto=${window.location.href}`;
  } else if (domainSplitted.length === 4) {
    return `https://platform${domainSplitted[2]}.${domainSplitted[3]}` +
      `/authentication/api/v1/authentication?goto=${window.location.href}`;
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
  } else {
    throw new Error('Unknown domain');
  }
};
