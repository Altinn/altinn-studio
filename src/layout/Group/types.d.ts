import type { DeepPartial } from 'utility-types';

import type { ExprResolved, ExprVal } from 'src/features/expressions/types';
import type { GridComponent, GridRow } from 'src/layout/Grid/types';
import type { ILayoutCompBase, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/layout';
import type { ILayoutCompPanelBase } from 'src/layout/Panel/types';
import type { HComponent, HierarchyExtensions } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
  rowsBefore?: GridRow[];
  rowsAfter?: GridRow[];
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

/**
 * Base type used for repeating group and non-repeating groups
 */
type HGroup = Omit<ExprResolved<ILayoutGroup>, 'children' | 'rowsBefore' | 'rowsAfter'> &
  HierarchyExtensions & {
    rowsBefore?: GridRow<GridComponent>[];
    rowsAfter?: GridRow<GridComponent>[];
  };

/**
 * Definition of a non-repeating group inside a hierarchy structure
 */
export type HNonRepGroup = HGroup & {
  childComponents: LayoutNode<HComponent | HGroups>[];
};
/**
 * A row object for a repeating group
 */
export type HRepGroupRow = {
  index: number;
  items: LayoutNode<HRepGroupChild>[];

  // If this object is present, it contains a subset of the Group layout object, where some expressions may be resolved
  // in the context of the current repeating group row.
  groupExpressions?: DeepPartial<ExprResolved<ILayoutGroup>>;
};
/**
 * Definition of a repeating group component inside a hierarchy structure
 */
export type HRepGroup = HGroup & {
  rows: (HRepGroupRow | undefined)[];
};
/**
 * Types of possible components inside repeating group rows
 */
export type HRepGroupChild = HComponent | HNonRepGroup | HRepGroup;
export type HGroups = HNonRepGroup | HRepGroup;
