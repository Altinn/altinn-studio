import { describe, expect, it } from 'vitest';
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

  it('maps an empty list of optionListUsages to an empty array', () => {
    const codeListUsages = mapToCodeListUsages([]);
    expect(codeListUsages).toEqual([]);
  });

  it.each([undefined, null])('maps %s optionListUsages to undefined', (optionListUsages) => {
    const codeListUsages = mapToCodeListUsages(optionListUsages);
    expect(codeListUsages).toBeUndefined();
  });

  it('maps optionListUsages that are not a list to undefined', () => {
    const notAList = '' as unknown as OptionListReferences;
    const codeListUsages = mapToCodeListUsages(notAList);
    expect(codeListUsages).toBeUndefined();
  });
});
