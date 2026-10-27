import { describe, expect, it } from 'vitest';
import { filterTableData, isResourceInactive } from './resourceListUtils';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

const dataToFilter: ResourceListItem[] = [
  {
    title: { nb: 'Test', nn: 'Test', en: 'Test' },
    createdBy: 'William',
    lastChanged: new Date('2023-08-24'),
    identifier: 'resource-id',
    environments: ['gitea'],
  },
  {
    title: { nb: 'Test 2', nn: 'Test 2', en: 'Test 2' },
    createdBy: 'William',
    lastChanged: new Date('2023-08-24'),
    identifier: 'res2',
    environments: ['gitea'],
  },
  {
    title: null,
    createdBy: 'William',
    lastChanged: new Date('2023-08-24'),
    identifier: 'res3',
    environments: ['gitea'],
  },
];

const expectedResult: ResourceListItem[] = [
  {
    title: { nb: 'Test 2', nn: 'Test 2', en: 'Test 2' },
    createdBy: 'William',
    lastChanged: new Date('2023-08-24'),
    identifier: 'res2',
    environments: ['gitea'],
  },
];

describe('filterTableData', () => {
  it('Filter out the data searched for', () => {
    let result = filterTableData('sT 2', dataToFilter, false);
    expect(result).toEqual(expectedResult);

    result = filterTableData('ST 2', dataToFilter, false);
    expect(result).toEqual(expectedResult);

    result = filterTableData('TEST 2', dataToFilter, false);
    expect(result).toEqual(expectedResult);

    result = filterTableData('TeSt 2', dataToFilter, false);
    expect(result).toEqual(expectedResult);

    result = filterTableData('tEsT 2', dataToFilter, false);
    expect(result).toEqual(expectedResult);

    result = filterTableData('resource-id', dataToFilter, false);
    expect(result).toEqual([dataToFilter[0]]);
  });

  it('Retuns all resources when search string is empty', () => {
    const result = filterTableData('', dataToFilter, false);
    expect(result).toEqual(dataToFilter);
  });
});

const createResourceWithStatus = (identifier: string, status?: string): ResourceListItem => ({
  title: { nb: identifier, nn: '', en: '' },
  createdBy: 'William',
  identifier,
  environments: ['gitea'],
  status,
});

describe('isResourceInactive', () => {
  it.each(['Deprecated', 'Withdrawn', 'Discontinued', 'deprecated', 'WITHDRAWN'])(
    'returns true when status is %s',
    (status) => {
      expect(isResourceInactive(createResourceWithStatus('res', status))).toBe(true);
    },
  );

  it.each(['Completed', 'UnderDevelopment', 'Active', '', undefined, null])(
    'returns false when status is %s',
    (status) => {
      expect(isResourceInactive(createResourceWithStatus('res', status))).toBe(false);
    },
  );
});

describe('filterTableData with status', () => {
  const activeResource = createResourceWithStatus('active-resource', 'Completed');
  const resourceWithoutStatus = createResourceWithStatus('resource-without-status');
  const deprecatedResource = createResourceWithStatus('deprecated-resource', 'Deprecated');
  const withdrawnResource = createResourceWithStatus('withdrawn-resource', 'Withdrawn');
  const resources = [activeResource, resourceWithoutStatus, deprecatedResource, withdrawnResource];

  it('hides inactive resources when showInactive is false', () => {
    expect(filterTableData('', resources, false)).toEqual([activeResource, resourceWithoutStatus]);
  });

  it('shows inactive resources when showInactive is true', () => {
    expect(filterTableData('', resources, true)).toEqual(resources);
  });

  it('combines the search value with the status filter', () => {
    expect(filterTableData('deprecated', resources, false)).toEqual([]);
    expect(filterTableData('deprecated', resources, true)).toEqual([deprecatedResource]);
  });
});
