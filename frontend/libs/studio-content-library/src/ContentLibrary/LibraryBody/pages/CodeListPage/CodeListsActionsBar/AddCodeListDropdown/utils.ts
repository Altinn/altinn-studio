import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import { StringUtils } from '@studio/pure-functions';

export const getCodeListIdsFromExternalResources = (
  externalResourceIds: ExternalResource[],
): string[] => {
  if (!externalResourceIds) {
    return [];
  }
  const filteredResources: ExternalResource[] =
    filterOutCodeListResourcesFromExternalResources(externalResourceIds);
  const mappedResources: string[] = mapCodeListResourceToCodeListId(filteredResources);
  return mappedResources;
};

const filterOutCodeListResourcesFromExternalResources = (
  externalResourceIds: ExternalResource[],
): ExternalResource[] => {
  return externalResourceIds.filter((externalResource: ExternalResource) =>
    isExternalResourceCodeList(externalResource),
  );
};

const isExternalResourceCodeList = (externalResource: ExternalResource): boolean => {
  return StringUtils.areCaseInsensitiveEqual(externalResource.type, LibraryContentType.CodeList);
};

const mapCodeListResourceToCodeListId = (externalResourceIds: ExternalResource[]): string[] => {
  return externalResourceIds.map((externalResource) => externalResource.id);
};
