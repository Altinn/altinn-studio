import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import type { CodeListReference } from '@studio/content-library';

export const mapToCodeListsUsage = (
  optionListsUsages: OptionListReferences,
): CodeListReference[] => {
  const codeListsUsages: CodeListReference[] = [];
  if (!optionListsUsages) return codeListsUsages;
  optionListsUsages.map((optionListsUsage) =>
    codeListsUsages.push({
      codeListId: optionListsUsage.optionListId,
      codeListIdSources: optionListsUsage.optionListIdSources,
    }),
  );
  return codeListsUsages;
};
