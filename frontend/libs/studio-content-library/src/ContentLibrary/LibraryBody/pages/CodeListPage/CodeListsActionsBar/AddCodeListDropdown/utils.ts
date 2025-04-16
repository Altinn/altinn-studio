import type { ExternalResource } from 'app-shared/types/ExternalResource';

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
  return externalResource.type === 'code_list';
};

const mapCodeListResourceToCodeListId = (externalResourceIds: ExternalResource[]): string[] => {
  return externalResourceIds.map((externalResource) => externalResource.id);
};
