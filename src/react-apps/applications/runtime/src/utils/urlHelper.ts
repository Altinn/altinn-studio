const altinnWindow = window as any;
const { org, app, reportee } = altinnWindow;
const origin = window.location.origin;

export const verifySubscriptionUrl = `${origin}/api/v1/${org}/${app}/verifySubscription?partyId=${reportee}`;
export const languageUrl = `${origin}/${org}/${app}/api/Language/GetLanguageAsJSON`;
export const profileApiUrl = `${origin}/${org}/${app}/api/v1/profile/user`;
export const applicationMetadataApiUrl = `${origin}/${org}/${app}/api/v1/applicationmetadata`;
export const textResourcesUrl = `${origin}/${org}/${app}/api/textresources`;
export const updateCookieUrl: (partyId: string) => string = (partyId: string) => `
  ${origin}/${org}/${app}/api/v1/parties/${partyId}
`;
export const validPartiesUrl: string =
  `${origin}/${org}/${app}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const allPartiesUrl: string =
`${origin}/${org}/${app}/api/v1/parties?allowedtoinstantiatefilter=false`;
export const instantiateUrl: string = `${origin}/${org}/${app}/Instance/InstantiateApp`;
export const currentPartyUrl: string = `${origin}/${org}/${app}/api/authorization/parties/current`;
export const instancesControllerUrl: string = `${origin}/${org}/${app}/instances`;
export const partySelectionUrl: string = `${origin}/${org}/${app}/#/partyselection`;
export const refreshJwtTokenUrl: string = `${origin}/${org}/${app}/api/authentication/keepAlive`;
export const reactErrorPage: string = `${origin}/${org}/${app}/#/error`;

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
    throw new Error('Unknown domain');
  }
};
