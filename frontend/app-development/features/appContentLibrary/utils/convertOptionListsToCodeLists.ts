import type { CodeListWithMetadata } from '@studio/content-library';

export function convertOptionListsToCodeLists(optionLists: any): CodeListWithMetadata[] {
  // TODO: Update type when correct type is in main
  const codeLists = [];
  Object.entries(optionLists).map((optionList) =>
    codeLists.push({
      codeList: optionList[1],
      title: optionList[0],
    }),
  );
  return codeLists;
}
