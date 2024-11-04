import type { CodeList as StudioComponentCodeList } from '@studio/components';

type CodeList = {
  codeList: StudioComponentCodeList;
  title: string;
};

export function convertOptionListsToCodeLists(optionLists: any): CodeList[] {
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
