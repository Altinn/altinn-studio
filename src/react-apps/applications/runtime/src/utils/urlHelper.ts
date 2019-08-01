const altinnWindow = window as any;
const { origin, org, service, reportee } = altinnWindow;

export const verifySubscriptionUrl = `${origin}/api/v1/${org}/${service}/verifySubscription?partyId=${reportee}`;

export const textResourcesUrl = `${origin}/${org}/${service}/api/textresources`;
