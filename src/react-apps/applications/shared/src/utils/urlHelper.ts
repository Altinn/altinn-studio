const altinnWindow = window as any;
const { origin, org, service } = altinnWindow;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${service}`;
};

export const altinnAppsImgLogoBlueSvgUrl = 'http://altinncdn.no/altinn-apps/img/a-logo-blue.svg';
export const altinnImgLogoHeaderUrl = 'https://altinncdn.no/img/altinn_logo_header.png';
