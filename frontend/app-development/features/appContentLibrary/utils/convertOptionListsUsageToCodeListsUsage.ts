import type { OptionListsReferences } from 'app-shared/types/api/OptionsLists';
import type { CodeListReference } from '@studio/content-library';

export const convertOptionListsUsageToCodeListsUsage = (
  optionListsUsages: OptionListsReferences,
): CodeListReference[] => {
  const codeListsUsages: CodeListReference[] = [];
  optionListsUsages.map((optionListsUsage) =>
    codeListsUsages.push({
      codeListId: optionListsUsage.optionListId,
      codeListIdSources: optionListsUsage.optionListIdSources,
    }),
  );
  return codeListsUsages;
};
