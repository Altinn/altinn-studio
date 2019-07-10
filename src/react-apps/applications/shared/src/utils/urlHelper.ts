const altinnWindow = window as IAltinnWindow;
const { origin, org, service } = altinnWindow;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${service}`;
};
