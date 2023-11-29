import type { IDataListsMetaData } from 'src/types';

export interface IDataList {
  listItems: Record<string, string>[];
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
