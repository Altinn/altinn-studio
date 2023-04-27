import type { ExprVal } from 'src/features/expressions/types';
import type { ILayoutCompBase, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/layout';
import type { ILayoutCompPanelBase } from 'src/layout/Panel/types';

export interface IGroupFilter {
  key: string;
  value: string;
}

export interface IGroupEditProperties {
  mode?: 'hideTable' | 'showTable' | 'showAll' | 'onlyTable' | 'likert';
  filter?: IGroupFilter[];
  addButton?: ExprVal.Boolean;
  saveButton?: ExprVal.Boolean;
  deleteButton?: ExprVal.Boolean;
  editButton?: ExprVal.Boolean;
  multiPage?: boolean;
  openByDefault?: boolean | 'first' | 'last';
  alertOnDelete?: ExprVal.Boolean;
  saveAndNextButton?: ExprVal.Boolean;
  alwaysShowAddButton?: boolean;
}

export interface ILayoutGroup extends ILayoutCompBase<'Group'> {
  children: string[];
  maxCount?: number;
  tableHeaders?: string[];
  tableColumns?: ITableColumnFormatting<IGroupColumnFormatting>;
  edit?: IGroupEditProperties;
  panel?: IGroupPanel;
  hiddenRow?: ExprVal.Boolean;
}

export interface IGroupColumnFormatting extends ITableColumnProperties {
  editInTable?: boolean;
  showInExpandedEdit?: boolean;
}

export interface IDataModelBindingsForGroup {
  group: string;
}

export interface IGroupPanel extends ILayoutCompPanelBase {
  iconUrl?: string;
  iconAlt?: string;
  groupReference?: {
    group: string;
  };
}
