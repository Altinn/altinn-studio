import type { OptionsList } from 'app-shared/types/api/OptionsLists';
import type { OnGetCodeListResult } from '@studio/content-library';

export const convertOptionsListToCodeListResult = (
  optionListId: string,
  optionsList: OptionsList,
  isError: boolean,
): OnGetCodeListResult => {
  const codeListWithMetadata = { title: optionListId, codeList: optionsList };
  return {
    codeListWithMetadata: codeListWithMetadata,
    isError: isError,
  };
};
