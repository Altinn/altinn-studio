const altinnWindow = window as any;
const { origin, org, service, reportee } = altinnWindow;

export const getVerifySubscriptionUrl = (): string => {
  return `${origin}/api/v1/${org}/${service}/verifySubscription?partyId=${reportee}`;
};

export const getTextResourcesUrl = (): string => {
  return  `${origin}/${org}/${service}/api/textresources`;
};
