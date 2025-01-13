import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';

export const getCodeListSourcesById = (
  codeListsUsages: CodeListReference[],
  codeListTitle: string,
): CodeListIdSource[] => {
  const codeListUsages: CodeListReference | undefined = codeListsUsages.find(
    (codeListUsage) => codeListUsage.codeListId === codeListTitle,
  );
  return codeListUsages?.codeListIdSources ?? [];
};

export const getCodeListUsageCount = (codeListSources: CodeListIdSource[]): number => {
  return codeListSources.reduce(
    (total: number, source: CodeListIdSource) => total + source.componentIds.length,
    0,
  );
};
