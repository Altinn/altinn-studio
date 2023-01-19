import type { ILayoutCompBase } from 'src/layout/layout';
import type { IMapping } from 'src/types';

export interface IPagination {
  alternatives: number[];
  default: number;
}

export interface ILayoutCompList extends ILayoutCompBase<'List'> {
  tableHeaders: Record<string, string>;
  sortableColumns?: string[];
  pagination?: IPagination;
  dataListId: string;
  secure?: boolean;
  mapping?: IMapping;
  bindingToShowInSummary?: string;
  tableHeadersMobile?: string[];
}

export interface IDataModelBindingsForList {
  [columnKey: string]: string;
}
