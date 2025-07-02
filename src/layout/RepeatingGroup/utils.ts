import { useCallback, useMemo } from 'react';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { GroupExpressions } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseRow } from 'src/utils/layout/types';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';

export interface RepGroupRow extends BaseRow {
  hidden: boolean;
}

export interface RepGroupRowWithButtons extends RepGroupRow {
  editButton: boolean;
  deleteButton: boolean;
}

export type RepGroupRowWithExpressions = RepGroupRow & GroupExpressions;

const noRows: never[] = [];

interface EvalExprProps<T extends ExprVal> {
  expr: ExprValToActualOrExpr<T> | undefined;
  defaultValue?: ExprValToActual<T>;
  dataSources: ExpressionDataSources;
  groupBinding: IDataModelReference | undefined;
  rowIndex: number;
}

function evalString({ expr, defaultValue = '', dataSources, groupBinding, rowIndex }: EvalExprProps<ExprVal.String>) {
  if (!ExprValidation.isValidOrScalar(expr, ExprVal.String) || !groupBinding) {
    return defaultValue;
  }

  const currentDataModelPath = {
    dataType: groupBinding.dataType,
    field: `${groupBinding.field}[${rowIndex}]`,
  };
  return evalExpr(expr, { ...dataSources, currentDataModelPath }, { returnType: ExprVal.String, defaultValue });
}

function evalBool({ expr, defaultValue = false, dataSources, groupBinding, rowIndex }: EvalExprProps<ExprVal.Boolean>) {
  if (!ExprValidation.isValidOrScalar(expr, ExprVal.Boolean) || !groupBinding) {
    return defaultValue;
  }

  const currentDataModelPath = {
    dataType: groupBinding.dataType,
    field: `${groupBinding.field}[${rowIndex}]`,
  };
  return evalExpr(expr, { ...dataSources, currentDataModelPath }, { returnType: ExprVal.Boolean, defaultValue });
}

export const RepGroupHooks = {
  useAllBaseRows(node: LayoutNode<'RepeatingGroup'>) {
    const groupBinding = useDataModelBindingsFor(node.baseId, 'RepeatingGroup')?.group;
    return FD.useFreshRows(groupBinding);
  },

  useAllRowsWithHidden(node: LayoutNode<'RepeatingGroup'>): RepGroupRow[] {
    const component = useExternalItem(node.baseId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(node.baseId, 'RepeatingGroup')?.group;
    const dataSources = useExpressionDataSources(component?.hiddenRow);
    const rows = RepGroupHooks.useAllBaseRows(node);

    return useMemo(
      () =>
        (groupBinding &&
          rows.map((row) => ({
            ...row,
            hidden: evalBool({ expr: component?.hiddenRow, dataSources, groupBinding, rowIndex: row.index }),
          }))) ??
        noRows,
      [rows, component?.hiddenRow, dataSources, groupBinding],
    );
  },

  useAllRowsWithButtons(node: LayoutNode<'RepeatingGroup'>): RepGroupRowWithButtons[] {
    const component = useExternalItem(node.baseId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(node.baseId, 'RepeatingGroup')?.group;
    const hiddenRow = component?.hiddenRow;
    const editButton = component?.edit?.editButton;
    const deleteButton = component?.edit?.deleteButton;
    const dataSources = useExpressionDataSources({ hiddenRow, editButton, deleteButton });
    const rows = RepGroupHooks.useAllBaseRows(node);

    return useMemo(
      () =>
        (groupBinding &&
          rows.map((row) => {
            const baseProps = { dataSources, groupBinding, rowIndex: row.index };
            return {
              ...row,
              hidden: evalBool({ expr: hiddenRow, ...baseProps }) ?? false,
              editButton: evalBool({ expr: editButton, ...baseProps, defaultValue: true }) ?? true,
              deleteButton: evalBool({ expr: deleteButton, ...baseProps, defaultValue: true }) ?? true,
            };
          })) ??
        noRows,
      [dataSources, deleteButton, editButton, groupBinding, hiddenRow, rows],
    );
  },

  useGetFreshRowsWithButtons(node: LayoutNode<'RepeatingGroup'>): () => RepGroupRowWithButtons[] {
    const component = useExternalItem(node.baseId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(node.baseId, 'RepeatingGroup')?.group;
    const hiddenRow = component?.hiddenRow;
    const editButton = component?.edit?.editButton;
    const deleteButton = component?.edit?.deleteButton;
    const dataSources = useExpressionDataSources({ hiddenRow, editButton, deleteButton });
    const getFreshRows = FD.useGetFreshRows();

    return useCallback(() => {
      const freshRows = getFreshRows(groupBinding);
      return freshRows.map((row) => {
        const baseProps = { dataSources, groupBinding, rowIndex: row.index };
        return {
          ...row,
          hidden: evalBool({ expr: hiddenRow, ...baseProps }) ?? false,
          editButton: evalBool({ expr: editButton, ...baseProps, defaultValue: true }) ?? true,
          deleteButton: evalBool({ expr: deleteButton, ...baseProps, defaultValue: true }) ?? true,
        };
      });
    }, [dataSources, deleteButton, editButton, getFreshRows, groupBinding, hiddenRow]);
  },

  useRowWithExpressions(
    node: LayoutNode<'RepeatingGroup'>,
    _row: 'first' | { uuid: string } | { index: number },
  ): RepGroupRowWithExpressions | undefined {
    const component = useExternalItem(node.baseId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(node.baseId, 'RepeatingGroup')?.group;
    const hiddenRow = component?.hiddenRow;
    const edit = component?.edit;
    const trb = component?.textResourceBindings;
    const dataSources = useExpressionDataSources({ hiddenRow, edit, trb });
    const rows = RepGroupHooks.useAllBaseRows(node);
    const row = _row === 'first' ? rows[0] : 'uuid' in _row ? rows.find((r) => r.uuid === _row.uuid) : rows[_row.index];

    return useMemo(() => {
      if (!groupBinding || !row) {
        return undefined;
      }
      const baseProps = { dataSources, groupBinding, rowIndex: row.index };
      return {
        ...row,
        hidden: evalBool({ expr: hiddenRow, ...baseProps }) ?? false,
        textResourceBindings: trb
          ? {
              edit_button_close: evalString({ expr: trb.edit_button_close, ...baseProps }),
              edit_button_open: evalString({ expr: trb.edit_button_open, ...baseProps }),
              save_and_next_button: evalString({ expr: trb.save_and_next_button, ...baseProps }),
              save_button: evalString({ expr: trb.save_button, ...baseProps }),
            }
          : undefined,
        edit: edit
          ? {
              alertOnDelete: evalBool({ expr: edit.alertOnDelete, ...baseProps }),
              editButton: evalBool({ expr: edit.editButton, ...baseProps, defaultValue: true }),
              deleteButton: evalBool({ expr: edit.deleteButton, ...baseProps, defaultValue: true }),
              saveAndNextButton: evalBool({ expr: edit.saveAndNextButton, ...baseProps }),
              saveButton: evalBool({ expr: edit.saveButton, ...baseProps, defaultValue: true }),
            }
          : undefined,
      };
    }, [groupBinding, row, dataSources, hiddenRow, trb, edit]);
  },

  useVisibleRows(node: LayoutNode<'RepeatingGroup'>) {
    const withHidden = RepGroupHooks.useAllRowsWithHidden(node);
    return withHidden.filter((row) => !row.hidden);
  },

  useLastMultiPageIndex(node: LayoutNode<'RepeatingGroup'>) {
    const component = useLayoutLookups().getComponent(node.baseId, 'RepeatingGroup');
    if (!component.edit?.multiPage) {
      return undefined;
    }

    let lastMultiPageIndex = 0;
    for (const id of component.children) {
      const [multiPageIndex] = id.split(':', 2);
      lastMultiPageIndex = Math.max(lastMultiPageIndex, parseInt(multiPageIndex));
    }

    return lastMultiPageIndex;
  },

  useChildIds(node: LayoutNode<'RepeatingGroup'>) {
    const component = useLayoutLookups().getComponent(node.baseId, 'RepeatingGroup');
    const idMutator = useComponentIdMutator();
    if (!component?.edit?.multiPage) {
      return component?.children.map(idMutator) ?? [];
    }

    const childIds: string[] = [];
    for (const id of component.children) {
      const [_, baseId] = id.split(':', 2);
      childIds.push(idMutator(baseId));
    }

    return childIds;
  },
};
