import type { CodeListWithMetadata } from '@studio/content-library';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';

export function convertOptionListsToCodeLists(optionLists: OptionsLists): CodeListWithMetadata[] {
  const codeLists = [];
  Object.entries(optionLists).map((optionList) =>
    codeLists.push({
      codeList: optionList[1],
      title: optionList[0],
    }),
  );
  return codeLists;
}
