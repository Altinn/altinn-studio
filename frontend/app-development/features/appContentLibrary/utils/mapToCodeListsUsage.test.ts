import type { CodeListIdSource } from '@studio/content-library';
import { mapToCodeListsUsage } from './mapToCodeListsUsage';
import type { OptionListsReferences } from 'app-shared/types/api/OptionsLists';

const optionListId: string = 'optionListId';
const optionListIdSources: CodeListIdSource[] = [
  {
    layoutSetId: 'layoutSetId',
    layoutName: 'layoutName',
    componentIds: ['componentId1', 'componentId2'],
  },
];
const optionListsUsages: OptionListsReferences = [
  {
    optionListId,
    optionListIdSources,
  },
];

describe('mapToCodeListsUsage', () => {
  it('maps optionListsUsage to codeListUsage', () => {
    const codeListUsage = mapToCodeListsUsage({ optionListsUsages });
    expect(codeListUsage).toEqual([
      {
        codeListId: optionListId,
        codeListIdSources: optionListIdSources,
      },
    ]);
  });

  it('maps undefined optionListsUsage to empty array', () => {
    const codeListUsage = mapToCodeListsUsage({ optionListsUsages: undefined });
    expect(codeListUsage).toEqual([]);
  });
});
