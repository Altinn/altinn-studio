const altinnWindow = window as any;
const { origin, org, service } = altinnWindow;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${service}`;
};

export const altinnAppsImgLogoBlueSvg = 'http://altinncdn.no/altinn-apps/img/a-logo-blue.svg';
export const altinnImgLogoHeader = 'https://altinncdn.no/img/altinn_logo_header.png';
