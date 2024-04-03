import { filterTableData } from './resourceListUtils';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';

describe('filterTableData', () => {
  it('Filter out the data searched for', () => {
    const dataToFilter: ResourceListItem[] = [
      {
        title: { nb: 'Test', nn: 'Test', en: 'Test' },
        createdBy: 'William',
        lastChanged: '24.08.2023',
        hasPolicy: true,
        identifier: '1',
      },
      {
        title: { nb: 'Test 2', nn: 'Test 2', en: 'Test 2' },
        createdBy: 'William',
        lastChanged: '24.08.2023',
        hasPolicy: true,
        identifier: '1',
      },
      {
        title: { nb: '123', nn: '123', en: '123' },
        createdBy: 'William',
        lastChanged: '24.08.2023',
        hasPolicy: true,
        identifier: '1',
      },
    ];

    const expectedResult: ResourceListItem[] = [
      {
        title: { nb: 'Test 2', nn: 'Test 2', en: 'Test 2' },
        createdBy: 'William',
        lastChanged: '24.08.2023',
        hasPolicy: true,
        identifier: '1',
      },
    ];

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
  });
});
