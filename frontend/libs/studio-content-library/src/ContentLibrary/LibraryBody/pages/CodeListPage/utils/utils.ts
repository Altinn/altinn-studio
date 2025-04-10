import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import type { CodeListData } from '../CodeListPage';
import type { TextResources } from '../../../../../types/TextResources';
import type { TextResource } from '@studio/components-legacy';
import type { TextResourceWithLanguage } from '../../../../../types/TextResourceWithLanguage';

export const getCodeListSourcesById = (
  codeListsUsages: CodeListReference[] | undefined,
  codeListTitle: string,
): CodeListIdSource[] => {
  const codeListUsages: CodeListReference | undefined = codeListsUsages?.find(
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

export const filterCodeLists = (
  codeListsData: CodeListData[],
  searchString: string,
): CodeListData[] =>
  codeListsData.filter((codeList: CodeListData) => codeListMatch(codeList.title, searchString));

function codeListMatch(codeListTitle: string, searchString: string): boolean {
  return caseInsensitiveMatch(codeListTitle, searchString);
}

function caseInsensitiveMatch(target: string, searchString: string): boolean {
  const lowerCaseTarget = target.toLowerCase();
  const lowerCaseSearchString = searchString.toLowerCase();
  return lowerCaseTarget.includes(lowerCaseSearchString);
}

export const getTextResourcesForLanguage = (
  language: string,
  textResources?: TextResources,
): TextResource[] | undefined => textResources?.[language];

export const createTextResourceWithLanguage = (
  language: string,
  textResource: TextResource,
): TextResourceWithLanguage => ({ language, textResource });
