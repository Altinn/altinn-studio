const altinnWindow = window as any;
const { org, service, reportee } = altinnWindow;
const origin = window.location.origin;

export const verifySubscriptionUrl = `${origin}/api/v1/${org}/${service}/verifySubscription?partyId=${reportee}`;

export const textResourcesUrl = `${origin}/${org}/${service}/api/textresources`;
