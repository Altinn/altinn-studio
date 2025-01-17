import type { CodeListData } from '@studio/content-library';
import { convertOptionListDataListToCodeListDataList } from './convertOptionListDataListToCodeListDataList';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

describe('convertOptionsListsDataToCodeListsData', () => {
  it('converts option lists data to code lists data correctly', () => {
    const optionListId: string = 'optionListId';
    const optionListsData: OptionListsResponse = [
      {
        title: optionListId,
        data: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ],
        hasError: false,
      },
    ];
    const result: CodeListData[] = convertOptionListDataListToCodeListDataList(optionListsData);
    expect(result).toEqual([
      {
        title: optionListId,
        data: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ],
        hasError: false,
      },
    ]);
  });

  it('sets hasError to true in result when optionListsResponse returns an option list with error', () => {
    const optionListId: string = 'optionListId';
    const optionListsData: OptionListsResponse = [
      {
        title: optionListId,
        data: null,
        hasError: true,
      },
    ];
    const result: CodeListData[] = convertOptionListDataListToCodeListDataList(optionListsData);
    expect(result).toEqual([{ title: optionListId, data: null, hasError: true }]);
  });

  it('returns a result with empty code list data array when the input option list data is empty', () => {
    const optionListsData: OptionListsResponse = [];
    const result: CodeListData[] = convertOptionListDataListToCodeListDataList(optionListsData);
    expect(result).toEqual([]);
  });
});
