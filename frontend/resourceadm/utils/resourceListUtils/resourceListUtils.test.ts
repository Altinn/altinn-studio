import { dataFilteredResultMock, dataToFilterMock, searchValueMock } from "resourceadm/data-mocks/resourceListMocks";
import { filterTableData } from "./resourceListUtils";

describe('filterTableData', () => {
  it('Filter out the data searched for', () => {
    const result = filterTableData(searchValueMock, dataToFilterMock);
    expect(result).toEqual(dataFilteredResultMock);
  })
})
