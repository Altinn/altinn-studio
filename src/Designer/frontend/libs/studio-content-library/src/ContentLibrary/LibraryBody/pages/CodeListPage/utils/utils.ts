import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import type { CodeListData } from '../CodeListPage';
import type { TextResources } from '../../../../../types/TextResources';
import type { TextResource } from '@studio/components-legacy';
import type { TextResourceWithLanguage } from '../../../../../types/TextResourceWithLanguage';
import { CodeListUsageTaskType } from '../../../../../types/CodeListUsageTaskType';

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

export const getUsageTaskTypeTextKey = (taskType: CodeListUsageTaskType): string => {
  switch (taskType) {
    case CodeListUsageTaskType.Data:
      return 'app_content_library.code_lists.code_list_usage_table_task_type_data';
    case CodeListUsageTaskType.Signing:
      return 'app_content_library.code_lists.code_list_usage_table_task_type_signing';
    default:
      return taskType;
  }
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
