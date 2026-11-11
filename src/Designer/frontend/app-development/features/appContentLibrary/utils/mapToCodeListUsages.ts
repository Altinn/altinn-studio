import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import type { CodeListReference } from '@studio/content-library';

/**
 * Returns `undefined` when the usages are not a list, as when the response is empty,
 * since it is then unknown which code lists the components use.
 */
export const mapToCodeListUsages = (
  optionListUsages: OptionListReferences | null | undefined,
): CodeListReference[] | undefined => {
  if (!Array.isArray(optionListUsages)) return undefined;
  return optionListUsages.map((optionListsUsage) => ({
    codeListId: optionListsUsage.optionListId,
    codeListIdSources: optionListsUsage.optionListIdSources,
  }));
};
