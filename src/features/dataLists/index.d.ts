import type { IDataListsMetaData } from 'src/types';

export interface IDataList {
  listItems: Record<string, string | number | boolean>[];
  _metaData: IDataListsMetaData;
}
