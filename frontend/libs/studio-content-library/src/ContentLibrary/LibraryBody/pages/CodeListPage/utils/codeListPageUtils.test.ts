import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import { getCodeListSourcesById, getCodeListUsageCount } from './codeListPageUtils';

const codeListId1: string = 'codeListId1';
const codeListId2: string = 'codeListId2';
const componentIds: string[] = ['componentId1', 'componentId2'];
const codeListIdSource: CodeListIdSource = {
  layoutSetId: 'layoutSetId',
  layoutName: 'layoutName',
  componentIds,
};
const codeListIdSources1: CodeListIdSource[] = [codeListIdSource];
const codeListIdSources2: CodeListIdSource[] = [...codeListIdSources1];

describe('getCodeListSourcesById', () => {
  it('returns an array of CodeListSources if given Id is present in codeListsUsages array', () => {
    const codeListUsages: CodeListReference[] = [
      { codeListId: codeListId1, codeListIdSources: codeListIdSources1 },
      { codeListId: codeListId2, codeListIdSources: codeListIdSources2 },
    ];
    const codeListSources = getCodeListSourcesById(codeListUsages, codeListId1);

    expect(codeListSources).toBe(codeListIdSources1);
    expect(codeListSources).not.toBe(codeListIdSources2);
  });

  it('returns an empty array if given Id is not present in codeListsUsages array', () => {
    const codeListUsages: CodeListReference[] = [
      { codeListId: codeListId2, codeListIdSources: codeListIdSources2 },
    ];
    const codeListSources = getCodeListSourcesById(codeListUsages, codeListId1);
    expect(codeListSources).toEqual([]);
  });

  it('returns an empty array if codeListsUsages array is empty', () => {
    const codeListSources = getCodeListSourcesById([], codeListId1);
    expect(codeListSources).toEqual([]);
  });
});
describe('getCodeListUsageCount', () => {
  it('returns the total count of all component IDs across all codeListSources', () => {
    const codeListSources: CodeListIdSource[] = [
      { ...codeListIdSource, componentIds: ['id1', 'id2', 'id3'] },
      { ...codeListIdSource, componentIds: ['id4', 'id5'] },
    ];

    const usageCount = getCodeListUsageCount(codeListSources);

    expect(usageCount).toBe(5);
  });

  it('returns 0 if codeListSources array is empty', () => {
    const codeListSources: CodeListIdSource[] = [];

    const usageCount = getCodeListUsageCount(codeListSources);

    expect(usageCount).toBe(0);
  });

  it('returns 0 if all componentIds arrays are empty', () => {
    const codeListSources: CodeListIdSource[] = [
      { ...codeListIdSource, componentIds: [] },
      { ...codeListIdSource, componentIds: [] },
    ];

    const usageCount = getCodeListUsageCount(codeListSources);

    expect(usageCount).toBe(0);
  });

  it('handles a single codeListSource with multiple component IDs', () => {
    const codeListSources: CodeListIdSource[] = [
      { ...codeListIdSource, componentIds: ['id1', 'id2'] },
    ];

    const usageCount = getCodeListUsageCount(codeListSources);

    expect(usageCount).toBe(2);
  });

  it('handles a single codeListSource with no component IDs', () => {
    const codeListSources: CodeListIdSource[] = [{ ...codeListIdSource, componentIds: [] }];

    const usageCount = getCodeListUsageCount(codeListSources);

    expect(usageCount).toBe(0);
  });
});
