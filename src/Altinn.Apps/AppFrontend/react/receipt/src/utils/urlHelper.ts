import { getInstanceId, getInstanceOwnerId } from './instance';

export const altinnAt21PlatformUrl = 'https://platform.at21.altinn.cloud/';
export const altinnAt21Url = 'https://at21.altinn.cloud/';
export const altinnUrl = 'http://altinn.no/';
export const altinnOrganisationsUrl = 'https://altinncdn.no/orgs/altinn-orgs.json';
export const languageUrl = `${window.location.origin}/receipt/api/v1/language/GetLanguageAsJSON?languageCode=nb`;

export function getExtendedInstanceUrl(): string {
  return `${getAltinnCloudUrl()}receipt/api/v1/instances/${getInstanceOwnerId()}/${getInstanceId()}?includeParty=true`;
}

export function getAltinnCloudUrl(): string {
  if (window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname === 'local.altinn.cloud'
  ) {
    // if we are developing locally, point to test data in at21
    return altinnAt21PlatformUrl;
  }

  // Point to origin. Can be multiple environments.
  return `${window.location.origin}/`;
}

export function getUrlQueryParameterByKey(key: string): string {
  const match = RegExp(`[?&]${key}=([^&]*)`).exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

export function getApplicationMetadataUrl(org: string, app: string): string {
  return `${getAltinnCloudUrl()}storage/api/v1/applications/${org}/${app}`;
}

export function getUserUrl(): string {
  return `${window.location.origin}/receipt/api/v1/users/current`;
}

export function getTextResourceUrl(org: string, app: string, language: string): string {
  return `${window.location.origin}/storage/api/v1/applications/${org}/${app}/texts/${language}`;
}

export function getAltinnUrl(): string {
  if (window.location.hostname === 'localhost') {
    return altinnAt21Url;
  }
  return `${window.location.origin}/`;
}
