import type { ICodeListListElement } from '../types/global';

/*
  Returns the index of a given code list name, or -1 if not found
*/
export function getCodeListIndexByName(
  name: string,
  codeLists: ICodeListListElement[],
) {
  if (!codeLists) {
    return -1;
  }
  for (let i = 0; i < codeLists.length; i++) {
    if (codeLists[i].codeListName === name) {
      return i;
    }
  }
  return -1;
}
