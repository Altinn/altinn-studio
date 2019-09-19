const altinnWindow = window as any;
const { org, service, reportee } = altinnWindow;
const origin = window.location.origin;

export const verifySubscriptionUrl = `${origin}/api/v1/${org}/${service}/verifySubscription?partyId=${reportee}`;
export const languageUrl = `${origin}/${org}/${service}/api/Language/GetLanguageAsJSON`;
export const profileApiUrl = `${origin}/${org}/${service}/api/v1/profile/user`;
export const applicationMetadataApiUrl = `${origin}/${org}/${service}/api/v1/applicationmetadata`;
export const textResourcesUrl = `${origin}/${org}/${service}/api/textresources`;
export const updateCookieUrl: (partyId: string) => string = (partyId: string) => `
  ${origin}/${org}/${service}/api/v1/parties/${partyId}
`;
export const validPartiesUrl: string =
  `${origin}/${org}/${service}/api/v1/parties?allowedtoinstantiatefilter=true`;
export const allPartiesUrl: string =
`${origin}/${org}/${service}/api/v1/parties?allowedtoinstantiatefilter=false`;
export const instantiateUrl: string = `${origin}/${org}/${service}/Instance/InstantiateApp`;
export const currentPartyUrl: string = `${origin}/${org}/${service}/api/authorization/parties/current`;
export const instancesControllerUrl: string = `${origin}/${org}/${service}/instances`;
export const partySelectionUrl: string = `${origin}/${org}/${service}/#/partyselection`;
