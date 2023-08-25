import {
  dataToFilterMock,
  searchValueMock1,
  searchValueMock2,
  searchValueMock3,
  searchValueMock4,
  searchValueMock5,
} from "resourceadm/data-mocks/resourceListMocks";
import { filterTableData } from "./resourceListUtils";
import { ResourceListItem } from "app-shared/types/ResourceAdm";

describe('filterTableData', () => {
  it('Filter out the data searched for', () => {
    const expectedResult: ResourceListItem[] = [
      { title: { nb: 'Test 2', nn: 'Test 2', en: 'Test 2' }, createdBy: 'William', lastChanged: '24.08.2023', hasPolicy: true, identifier: '1' },
    ];

    let result = filterTableData(searchValueMock1, dataToFilterMock);
    expect(result).toEqual(expectedResult);

    result = filterTableData(searchValueMock2, dataToFilterMock);
    expect(result).toEqual(expectedResult);

    result = filterTableData(searchValueMock3, dataToFilterMock);
    expect(result).toEqual(expectedResult);

    result = filterTableData(searchValueMock4, dataToFilterMock);
    expect(result).toEqual(expectedResult);

    result = filterTableData(searchValueMock5, dataToFilterMock);
    expect(result).toEqual(expectedResult);
  })
})
