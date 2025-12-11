import {
  useApplicationMetadata,
  useHasApplicationMetadata,
} from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useHasTextResources } from 'src/features/language/textResources/TextResourcesProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useHasOrgs, useOrgs } from 'src/features/orgs/OrgsProvider';

export function useTextResourceOr<T extends string | undefined>(resource: string, fallback: T): string | T {
  const { langAsString } = useLanguage();

  const fromResources = langAsString(resource);
  if (fromResources !== resource) {
    return fromResources;
  }

  return fallback;
}

export function useHasAppTextsYet() {
  const hasAppMetadata = useHasApplicationMetadata();
  const hasOrgs = useHasOrgs();
  const hasTexts = useHasTextResources();

  return hasAppMetadata && hasOrgs && hasTexts;
}

export function useAppName() {
  const application = useApplicationMetadata();

  const appName = useTextResourceOr('appName', undefined);
  const oldAppName = useTextResourceOr('ServiceName', undefined);
  const selectedLanguage = useCurrentLanguage();
  const appNameFromMetadata = application.title[selectedLanguage] || application.title.nb;

  return appName || oldAppName || appNameFromMetadata;
}

export function useAppOwner() {
  const application = useApplicationMetadata();
  const fromMetaData = useOrgName(application.org);
  return useTextResourceOr('appOwner', fromMetaData);
}

export function useAppReceiver() {
  const application = useApplicationMetadata();
  const fromMetaData = useOrgName(application.org);
  return useTextResourceOr('appReceiver', fromMetaData);
}

export function useAppLogoAltText() {
  const application = useApplicationMetadata();
  const fromMetaData = useOrgName(application.org);
  return useTextResourceOr('appLogo.altText', fromMetaData);
}

function useOrgName(org: string | undefined) {
  const orgs = useOrgs();
  const currentLanguage = useCurrentLanguage();

  if (orgs && typeof org === 'string' && orgs[org]) {
    return orgs[org].name[currentLanguage] || orgs[org].name.nb;
  }

  return undefined;
}
