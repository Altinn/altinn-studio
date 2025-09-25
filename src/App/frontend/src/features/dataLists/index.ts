export interface IDataList {
  listItems: Record<string, string | number | boolean>[];
  _metaData: IDataListsMetaData;
}

export interface IDataListsMetaData {
  page: number;
  pageCount: number;
  pageSize: number;
  totaltItemsCount: number;

  // Used for manual navigation of pages when looking at the API response
  links: string[];
}
