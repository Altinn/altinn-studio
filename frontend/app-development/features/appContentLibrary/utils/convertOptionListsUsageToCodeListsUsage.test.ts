import type { CodeListIdSource } from '@studio/content-library';
import { convertOptionListsUsageToCodeListsUsage } from './convertOptionListsUsageToCodeListsUsage';
import type { OptionListsReferences } from 'app-shared/types/api/OptionsLists';

const optionListId: string = 'optionListId';
const optionListIdSources: CodeListIdSource[] = [
  {
    layoutSetId: 'layoutSetId',
    layoutName: 'layoutName',
    componentIds: ['componentId1', 'componentId2'],
  },
];
const optionListsUsage: OptionListsReferences = [
  {
    optionListId,
    optionListIdSources,
  },
];

describe('convertOptionListsUsageToCodeListsUsage', () => {
  it('converts optionListsUsage to codeListUsage', () => {
    const codeListUsage = convertOptionListsUsageToCodeListsUsage(optionListsUsage);
    expect(codeListUsage).toEqual([
      {
        codeListId: optionListId,
        codeListIdSources: optionListIdSources,
      },
    ]);
  });

  it('converts undefined optionListsUsage to empty array', () => {
    const codeListUsage = convertOptionListsUsageToCodeListsUsage(undefined);
    expect(codeListUsage).toEqual([]);
  });
});
