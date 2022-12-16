import type { ExpressionOr } from 'src/features/expressions/types';
import type { ILayoutCompBase } from 'src/layout/layout';
import type { IGroupPanel } from 'src/layout/Panel/types';

export interface IGroupFilter {
  key: string;
  value: string;
}

export interface IGroupEditProperties {
  mode?: 'hideTable' | 'showTable' | 'showAll' | 'likert';
  filter?: IGroupFilter[];
  addButton?: ExpressionOr<'boolean'>;
  saveButton?: ExpressionOr<'boolean'>;
  deleteButton?: ExpressionOr<'boolean'>;
  multiPage?: boolean;
  openByDefault?: boolean | 'first' | 'last';
  alertOnDelete?: ExpressionOr<'boolean'>;
  saveAndNextButton?: ExpressionOr<'boolean'>;
}

export interface ILayoutGroup extends ILayoutCompBase<'Group'> {
  children: string[];
  maxCount?: number;
  tableHeaders?: string[];
  edit?: IGroupEditProperties;
  panel?: IGroupPanel;
}

export interface IDataModelBindingsForGroup {
  group: string;
}
