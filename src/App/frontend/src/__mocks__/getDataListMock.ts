import type { IDataList } from 'src/features/dataLists';

export function getDataListMock(): IDataList {
  return {
    listItems: [
      { id: 1, name: 'John Doe', age: 30 },
      { id: 2, name: 'Jane Doe', age: 25 },
    ],
    _metaData: {
      page: 1,
      pageCount: 1,
      pageSize: 2,
      totaltItemsCount: 2,
      links: [],
    },
  };
}
