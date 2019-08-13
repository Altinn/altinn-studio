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
export const partiesUrl: string = `${window.location.origin}/${org}/${service}/api/v1/parties`;
export const instantiateUrl: string = `${window.location.origin}/${org}/${service}/Instance/InstantiateApp`;
