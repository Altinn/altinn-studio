import type { OptionListsReferences } from 'app-shared/types/api/OptionsLists';
import type { CodeListReference } from '@studio/content-library';

type MapToCodeListsUsageProps = {
  optionListsUsages: OptionListsReferences;
};

export const mapToCodeListsUsage = ({
  optionListsUsages,
}: MapToCodeListsUsageProps): CodeListReference[] => {
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
