import type { ILayoutCompBase } from 'src/layout/layout';

export interface IPagination {
  alternatives: number[];
  default: number;
}

export interface ILayoutCompList extends ILayoutCompBase<'List'> {
  tableHeaders?: string[];
  sortableColumns?: string[];
  pagination?: IPagination;
  dataListId: string;
  secure?: boolean;
  bindingToShowInSummary?: string;
}

export interface IDataModelBindingsForList {
  [columnKey: string]: string;
}
