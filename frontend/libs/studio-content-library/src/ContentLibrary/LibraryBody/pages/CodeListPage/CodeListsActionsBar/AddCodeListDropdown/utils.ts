import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import { StringUtils } from '@studio/pure-functions';

export const getCodeListIdsFromExternalResources = (
  externalResources: ExternalResource[],
): string[] => {
  if (!externalResources) {
    return [];
  }
  const filteredResources: ExternalResource[] =
    filterOutCodeListResourcesFromExternalResources(externalResources);
  const mappedResources: string[] = mapCodeListResourceToCodeListId(filteredResources);
  return mappedResources;
};

const filterOutCodeListResourcesFromExternalResources = (
  externalResources: ExternalResource[],
): ExternalResource[] => {
  return externalResources.filter((externalResource: ExternalResource) =>
    isExternalResourceCodeList(externalResource),
  );
};

const isExternalResourceCodeList = (externalResource: ExternalResource): boolean => {
  return StringUtils.areCaseInsensitiveEqual(externalResource.type, LibraryContentType.CodeList);
};

const mapCodeListResourceToCodeListId = (externalResources: ExternalResource[]): string[] => {
  return externalResources.map((externalResource) => externalResource.id);
};
