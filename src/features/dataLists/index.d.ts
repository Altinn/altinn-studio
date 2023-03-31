import type { SortDirection } from '@altinn/altinn-design-system';

import type { IDataLists, IDataListsMetaData } from 'src/types';

export interface IDataListsState {
  error: Error | null;
  dataLists: IDataLists;
  dataListsWithIndexIndicator?: IDataListsMetaData[];
  dataListCount: number;
  dataListLoadedCount: number;
  loading: boolean;
}

export interface IFetchDataListsFulfilledAction {
  key: string;
  dataLists: any;
  metadata: any;
}

export interface IFetchDataListsRejectedAction {
  key: string;
  error: Error;
}

export interface IFetchingDataListsAction {
  key: string;
  metaData: IOptionsMetaData;
}

export interface ISetDataListsWithIndexIndicators {
  dataListsWithIndexIndicators: IDataListsMetaData[];
}

export interface ISetDataLists {
  dataLists: IDataLists;
}

export interface ISetDataListsPageSize {
  key: string;
  size: number;
}

export interface ISetDataListsPageNumber {
  key: string;
  pageNumber: number;
}

export interface ISetSort {
  key: string;
  sortColumn: string;
  sortDirection: SortDirection;
}

export interface IDataList {
  listItems: Record<string, string>[];
  _metaData: IDataListPaginationData;
}

export interface IDataLists {
  [key: string]: IDataListData;
}

export interface IDataListActualData {
  listItems: Record<string, string>[];
}

export interface IDataListsMetaData {
  id: string;
  mapping?: IMapping;
  loading?: boolean;
  secure?: boolean;
  size?: number;
  pageNumber?: number;
  paginationData?: IDataListPaginationData;
  sortColumn?: string;
  sortDirection?: SortDirection;
  dataListId?: string;
}

export interface IDataListPaginationData {
  totaltItemsCount: number;
}

export type IDataListData = IDataListActualData & IDataListsMetaData;

export interface IFetchSpecificDataListSaga {
  id: string;
  dataListId: string;
  dataMapping?: IMapping;
  secure?: boolean;
  paginationDefaultValue?: number;
}
