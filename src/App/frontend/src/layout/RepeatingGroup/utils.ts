import { useCallback, useMemo } from 'react';

import { CompCategory, type ExpressionDescriptor } from '@app/layout-contract';
import { CommonExpressions, Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { evaluateDescriptor } from 'src/features/expressions/evaluateDescriptor';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { FormStore } from 'src/features/form/FormContext';
import { getComponentDef } from 'src/layout';
import { useComponentIdMutator, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { getRepeatingChildBaseIds } from 'src/utils/layout/plugins/claimRepeatingChildren';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { CompExternal } from 'src/layout/layout';
import type { BaseRow } from 'src/utils/layout/types';

export interface RepGroupRow extends BaseRow {
  hidden: boolean;
}

export interface RepGroupRowWithButtons extends RepGroupRow {
  editButton: boolean;
  deleteButton: boolean;
}

type EditableRow = BaseRow & { editButton: boolean };

const noRows: never[] = [];

interface EvalExprProps<T extends ExprVal> {
  expr: ExprValToActualOrExpr<T> | undefined;
  descriptor: ExpressionDescriptor<T>;
  dataSources: ExpressionDataSources;
  groupBinding: IDataModelReference | undefined;
  rowIndex: number;
  componentId: string;
}

function evalRowExpression<T extends ExprVal>({
  expr,
  descriptor,
  dataSources,
  groupBinding,
  rowIndex,
  componentId,
}: EvalExprProps<T>) {
  if (!groupBinding) {
    return descriptor.defaultValue;
  }
  const currentDataModelPath = {
    dataType: groupBinding.dataType,
    field: `${groupBinding.field}[${rowIndex}]`,
  };
  return evaluateDescriptor(expr, descriptor, { ...dataSources, currentDataModelPath }, componentId);
}

function getReadOnlyExpression(component: CompExternal): ExprValToActualOrExpr<ExprVal.Boolean> | undefined {
  return 'readOnly' in component ? component.readOnly : undefined;
}

function isReadOnlyComponent(
  childComponent: CompExternal,
  dataSources: ExpressionDataSources,
  groupBinding: IDataModelReference | undefined,
  rowIndex: number,
): boolean {
  if (!('readOnly' in childComponent) || childComponent.readOnly === undefined) {
    return false;
  }
  return evalRowExpression({
    expr: childComponent.readOnly,
    componentId: childComponent.id,
    descriptor: CommonExpressions.FormComponentProps.readOnly,
    dataSources,
    groupBinding,
    rowIndex,
  });
}

/**
 * Helper function to check if a single form component is editable in a repeating group row
 */
function isEditableFormComponent(
  childBaseComponentId: string,
  layoutLookups: LayoutLookups,
  parentComponent: CompExternal<'RepeatingGroup'>,
  hiddenColumns: string[],
  rowWithExpressions: EditableRow | undefined,
  dataSources: ExpressionDataSources,
  groupBinding: IDataModelReference | undefined,
): boolean {
  const childComponent = layoutLookups.getComponent(childBaseComponentId);
  const componentDef = getComponentDef(childComponent.type);

  const isNotFormComponent: boolean = componentDef.category !== CompCategory.Form;
  if (isNotFormComponent) {
    return false;
  }

  if (isReadOnlyComponent(childComponent, dataSources, groupBinding, rowWithExpressions?.index ?? 0)) {
    return false;
  }

  const columnSettings = parentComponent.tableColumns?.[childBaseComponentId];
  const hiddenInTable = hiddenColumns.includes(childBaseComponentId);
  const editInTable = columnSettings?.editInTable ?? false;
  const showInExpandedEdit = columnSettings?.showInExpandedEdit ?? true;
  const editButtonVisible = rowWithExpressions?.editButton !== false;

  if (editButtonVisible) {
    return showInExpandedEdit;
  }

  return editInTable && !hiddenInTable;
}

function collectEditableChildren(
  childBaseComponentId: string,
  layoutLookups: LayoutLookups,
  parentComponent: CompExternal<'RepeatingGroup'>,
  hiddenColumns: string[],
  rowWithExpressions: EditableRow | undefined,
  dataSources: ExpressionDataSources,
  groupBinding: IDataModelReference | undefined,
  acc: string[],
) {
  const childComponent = layoutLookups.getComponent(childBaseComponentId);
  const componentDef = getComponentDef(childComponent.type);

  if (componentDef.category === CompCategory.Container) {
    const containerChildren = (childComponent as { children?: string[] }).children ?? [];
    for (const grandChildId of containerChildren) {
      collectEditableChildren(
        grandChildId,
        layoutLookups,
        parentComponent,
        hiddenColumns,
        rowWithExpressions,
        dataSources,
        groupBinding,
        acc,
      );
    }
    return;
  }

  if (
    isEditableFormComponent(
      childBaseComponentId,
      layoutLookups,
      parentComponent,
      hiddenColumns,
      rowWithExpressions,
      dataSources,
      groupBinding,
    )
  ) {
    acc.push(childBaseComponentId);
  }
}
export const RepGroupHooks = {
  useAllBaseRows(baseComponentId: string) {
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    return FormStore.data.useFreshRows(groupBinding);
  },

  useAllRowsWithHidden(baseComponentId: string): RepGroupRow[] {
    const componentId = useIndexedId(baseComponentId);
    const component = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const dataSources = useExpressionDataSources(component?.hiddenRow);
    const rows = RepGroupHooks.useAllBaseRows(baseComponentId);

    return useMemo(
      () =>
        (groupBinding &&
          rows.map((row) => ({
            ...row,
            hidden: evalRowExpression({
              expr: component?.hiddenRow,
              componentId,
              descriptor: Expressions.RepeatingGroup.hiddenRow,
              dataSources,
              groupBinding,
              rowIndex: row.index,
            }),
          }))) ??
        noRows,
      [rows, component?.hiddenRow, dataSources, groupBinding, componentId],
    );
  },

  useAllRowsWithButtons(baseComponentId: string): RepGroupRowWithButtons[] {
    const componentId = useIndexedId(baseComponentId);
    const component = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const hiddenRow = component?.hiddenRow;
    const editButton = component?.edit?.editButton;
    const deleteButton = component?.edit?.deleteButton;
    const dataSources = useExpressionDataSources({ hiddenRow, editButton, deleteButton });
    const rows = RepGroupHooks.useAllBaseRows(baseComponentId);

    return useMemo(
      () =>
        (groupBinding &&
          rows.map((row) => {
            const baseProps = { dataSources, groupBinding, rowIndex: row.index, componentId };
            return {
              ...row,
              hidden: evalRowExpression({
                expr: hiddenRow,
                descriptor: Expressions.RepeatingGroup.hiddenRow,
                ...baseProps,
              }),
              editButton: evalRowExpression({
                expr: editButton,
                descriptor: Expressions.RepeatingGroup.edit.editButton,
                ...baseProps,
              }),
              deleteButton: evalRowExpression({
                expr: deleteButton,
                descriptor: Expressions.RepeatingGroup.edit.deleteButton,
                ...baseProps,
              }),
            };
          })) ??
        noRows,
      [dataSources, deleteButton, editButton, groupBinding, hiddenRow, rows, componentId],
    );
  },

  useGetFreshRowsWithButtons(baseComponentId: string): () => RepGroupRowWithButtons[] {
    const componentId = useIndexedId(baseComponentId);
    const component = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const hiddenRow = component?.hiddenRow;
    const editButton = component?.edit?.editButton;
    const deleteButton = component?.edit?.deleteButton;
    const dataSources = useExpressionDataSources({ hiddenRow, editButton, deleteButton });
    const getFreshRows = FormStore.data.useGetFreshRows();

    return useCallback(() => {
      const freshRows = getFreshRows(groupBinding);
      return freshRows.map((row) => {
        const baseProps = { dataSources, groupBinding, rowIndex: row.index, componentId };
        return {
          ...row,
          hidden:
            evalRowExpression({ expr: hiddenRow, descriptor: Expressions.RepeatingGroup.hiddenRow, ...baseProps }) ??
            false,
          editButton: evalRowExpression({
            expr: editButton,
            descriptor: Expressions.RepeatingGroup.edit.editButton,
            ...baseProps,
          }),
          deleteButton: evalRowExpression({
            expr: deleteButton,
            descriptor: Expressions.RepeatingGroup.edit.deleteButton,
            ...baseProps,
          }),
        };
      });
    }, [dataSources, deleteButton, editButton, getFreshRows, groupBinding, hiddenRow, componentId]);
  },

  useVisibleRows(baseComponentId: string) {
    const withHidden = RepGroupHooks.useAllRowsWithHidden(baseComponentId);
    return withHidden.filter((row) => !row.hidden);
  },

  useChildIds(baseComponentId: string) {
    const component = useComponentConfig(baseComponentId, 'RepeatingGroup');
    return getRepeatingChildBaseIds(component?.children ?? [], component?.edit?.multiPage === true);
  },

  useChildIdsWithMultiPage(
    baseComponentId: string,
  ): { baseId: string; indexedId: string; multiPageIndex: number | undefined }[] {
    const component = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const idMutator = useComponentIdMutator();
    if (!component?.edit?.multiPage) {
      return (
        component?.children.map((baseId) => ({ baseId, indexedId: idMutator(baseId), multiPageIndex: undefined })) ?? []
      );
    }

    const children: { baseId: string; indexedId: string; multiPageIndex: number | undefined }[] = [];
    for (const id of component.children) {
      const [multiPageIndex, baseId] = id.split(':', 2);
      children.push({ baseId, indexedId: idMutator(baseId), multiPageIndex: parseInt(multiPageIndex) });
    }

    return children;
  },

  useChildIdsWithMultiPageAndHidden(
    baseComponentId: string,
  ): { baseId: string; indexedId: string; multiPageIndex: number | undefined; hidden: boolean }[] {
    const withMultiPage = RepGroupHooks.useChildIdsWithMultiPage(baseComponentId);
    const hidden = useIsHiddenMulti(withMultiPage.map(({ baseId }) => baseId));

    return withMultiPage.map(({ baseId, indexedId, multiPageIndex }) => ({
      baseId,
      indexedId,
      multiPageIndex,
      hidden: hidden[baseId] ?? false,
    }));
  },

  useEditableChildren(
    baseComponentId: string,
    rowWithExpressions: EditableRow | undefined,
    hiddenColumns: string[],
  ): string[] {
    const childrenBaseIds = RepGroupHooks.useChildIds(baseComponentId);
    const layoutLookups = FormStore.bootstrap.useLayoutLookups();
    const component = layoutLookups.getComponent(baseComponentId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const readOnlyExpressions = useMemo(
      () =>
        childrenBaseIds
          .map((id) => layoutLookups.getComponent(id))
          .map(getReadOnlyExpression)
          .filter((value) => value !== undefined),
      [childrenBaseIds, layoutLookups],
    );
    const dataSources = useExpressionDataSources(readOnlyExpressions);

    const editableChildIds: string[] = [];
    for (const childId of childrenBaseIds) {
      collectEditableChildren(
        childId,
        layoutLookups,
        component,
        hiddenColumns,
        rowWithExpressions,
        dataSources,
        groupBinding,
        editableChildIds,
      );
    }
    return editableChildIds;
  },
};
