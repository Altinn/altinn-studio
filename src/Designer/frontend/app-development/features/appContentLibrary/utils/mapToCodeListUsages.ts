import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import type { CodeListReference } from '@studio/content-library';

export const mapToCodeListUsages = (
  optionListUsages: OptionListReferences,
): CodeListReference[] => {
  if (!optionListUsages) return [];
  return optionListUsages.map((optionListsUsage) => ({
    codeListId: optionListsUsage.optionListId,
    codeListIdSources: optionListsUsage.optionListIdSources,
  }));
};
