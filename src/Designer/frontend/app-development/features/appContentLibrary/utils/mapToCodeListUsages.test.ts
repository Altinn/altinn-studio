import type { CodeListIdSource } from '@studio/content-library';
import { mapToCodeListUsages } from './mapToCodeListUsages';
import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import { CodeListUsageTaskType } from '@studio/content-library';

const optionListId: string = 'optionListId';
const optionListIdSources: CodeListIdSource[] = [
  {
    taskType: CodeListUsageTaskType.Data,
    taskId: 'taskId',
    layoutName: 'layoutName',
    componentIds: ['componentId1', 'componentId2'],
  },
];
const optionListUsages: OptionListReferences = [
  {
    optionListId,
    optionListIdSources,
  },
];

describe('mapToCodeListUsages', () => {
  it('maps optionListsUsages to codeListUsages', () => {
    const codeListUsages = mapToCodeListUsages(optionListUsages);
    expect(codeListUsages).toEqual([
      {
        codeListId: optionListId,
        codeListIdSources: optionListIdSources,
      },
    ]);
  });

  it('maps undefined optionListUsages to empty array', () => {
    const codeListUsages = mapToCodeListUsages(undefined);
    expect(codeListUsages).toEqual([]);
  });
});
