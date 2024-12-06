import type { CodeListWithMetadata } from '@studio/content-library';
import { convertOptionListsToCodeLists } from './convertOptionListsToCodeLists';
import type { OptionsLists } from 'app-shared/types/api/OptionsLists';

describe('convertOptionListsToCodeLists', () => {
  it('converts option lists map to code lists array correctly', () => {
    const optionLists: OptionsLists = {
      list1: [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
      ],
      list2: [
        { label: 'Option A', value: 'A' },
        { label: 'Option B', value: 'B' },
      ],
    };
    const result: CodeListWithMetadata[] = convertOptionListsToCodeLists(optionLists);
    expect(result).toEqual([
      {
        title: 'list1',
        codeList: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ],
      },
      {
        title: 'list2',
        codeList: [
          { label: 'Option A', value: 'A' },
          { label: 'Option B', value: 'B' },
        ],
      },
    ]);
  });

  it('returns an empty array when the input map is empty', () => {
    const optionLists: OptionsLists = {};
    const result: CodeListWithMetadata[] = convertOptionListsToCodeLists(optionLists);
    expect(result).toEqual([]);
  });
});
