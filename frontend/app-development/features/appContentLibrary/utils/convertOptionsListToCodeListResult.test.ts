import type { OnGetCodeListResult } from '@studio/content-library';
import { convertOptionsListToCodeListResult } from './convertOptionsListToCodeListResult';
import type { OptionsList } from 'app-shared/types/api/OptionsLists';

describe('convertOptionsListToCodeListResult', () => {
  it('converts option list to code list result correctly', () => {
    const optionList: OptionsList = [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ];
    const optionListId: string = 'optionListId';
    const result: OnGetCodeListResult = convertOptionsListToCodeListResult(
      optionListId,
      optionList,
      false,
    );
    expect(result).toEqual({
      codeListWithMetadata: {
        title: optionListId,
        codeList: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ],
      },
      isError: false,
    });
  });

  it('sets isError to true in result when getOptionsList returns error', () => {
    const optionListId: string = 'optionListId';
    const result: OnGetCodeListResult = convertOptionsListToCodeListResult(
      optionListId,
      undefined,
      false,
    );
    expect(result).toEqual({
      codeListWithMetadata: {
        title: optionListId,
        codeList: undefined,
      },
      isError: false,
    });
  });

  it('returns a result with empty code list array when the input option list is empty', () => {
    const optionList: OptionsList = [];
    const optionListId: string = 'optionListId';
    const result: OnGetCodeListResult = convertOptionsListToCodeListResult(
      optionListId,
      optionList,
      false,
    );
    expect(result).toEqual({
      codeListWithMetadata: { title: optionListId, codeList: [] },
      isError: false,
    });
  });
});
