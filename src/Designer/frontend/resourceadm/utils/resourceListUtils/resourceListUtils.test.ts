import { filterTableData } from './resourceListUtils';
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
    let result = filterTableData('sT 2', dataToFilter);
    expect(result).toEqual(expectedResult);

    result = filterTableData('ST 2', dataToFilter);
    expect(result).toEqual(expectedResult);

    result = filterTableData('TEST 2', dataToFilter);
    expect(result).toEqual(expectedResult);

    result = filterTableData('TeSt 2', dataToFilter);
    expect(result).toEqual(expectedResult);

    result = filterTableData('tEsT 2', dataToFilter);
    expect(result).toEqual(expectedResult);

    result = filterTableData('resource-id', dataToFilter);
    expect(result).toEqual([dataToFilter[0]]);
  });

  it('Retuns all resources when search string is empty', () => {
    const result = filterTableData('', dataToFilter);
    expect(result).toEqual(dataToFilter);
  });
});
