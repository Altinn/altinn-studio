import { useMemo } from 'react';

import { CompCategory } from '@app/layout-contract';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { getComponentDef } from 'src/layout';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { getRepeatingChildBaseIds } from 'src/utils/layout/plugins/claimRepeatingChildren';
import { useEvalExpressionCallback } from 'src/utils/layout/useEvalExpression';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { CompExternal } from 'src/layout/layout';
import type { BaseRow } from 'src/utils/layout/types';

export function getRepeatingRowReference(groupBinding: IDataModelReference | undefined, rowIndex: number) {
  return groupBinding ? { dataType: groupBinding.dataType, field: `${groupBinding.field}[${rowIndex}]` } : undefined;
}

/**
 * Helper function to check if a single form component is editable in a repeating group row
 */
function isEditableFormComponent(
  childBaseComponentId: string,
  layoutLookups: LayoutLookups,
  parentComponent: CompExternal<'RepeatingGroup'>,
  hiddenColumns: string[],
  editButton: boolean,
): boolean {
  const childComponent = layoutLookups.getComponent(childBaseComponentId);
  const componentDef = getComponentDef(childComponent.type);

  const isNotFormComponent: boolean = componentDef.category !== CompCategory.Form;
  if (isNotFormComponent) {
    return false;
  }

  const columnSettings = parentComponent.tableColumns?.[childBaseComponentId];
  const hiddenInTable = hiddenColumns.includes(childBaseComponentId);
  const editInTable = columnSettings?.editInTable ?? false;
  const showInExpandedEdit = columnSettings?.showInExpandedEdit ?? true;
  if (editButton) {
    return showInExpandedEdit;
  }

  return editInTable && !hiddenInTable;
}

function collectEditableChildren(
  childBaseComponentId: string,
  layoutLookups: LayoutLookups,
  parentComponent: CompExternal<'RepeatingGroup'>,
  hiddenColumns: string[],
  editButton: boolean,
  acc: string[],
) {
  const childComponent = layoutLookups.getComponent(childBaseComponentId);
  const componentDef = getComponentDef(childComponent.type);

  if (componentDef.category === CompCategory.Container) {
    const containerChildren = (childComponent as { children?: string[] }).children ?? [];
    for (const grandChildId of containerChildren) {
      collectEditableChildren(grandChildId, layoutLookups, parentComponent, hiddenColumns, editButton, acc);
    }
    return;
  }

  if (isEditableFormComponent(childBaseComponentId, layoutLookups, parentComponent, hiddenColumns, editButton)) {
    acc.push(childBaseComponentId);
  }
}
export const RepGroupHooks = {
  useAllBaseRows(baseComponentId: string) {
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    return FormStore.data.useFreshRows(groupBinding);
  },

  useVisibleRows(baseComponentId: string): BaseRow[] {
    const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const rows = RepGroupHooks.useAllBaseRows(baseComponentId);
    const isHidden = useEvalExpressionCallback(config.hiddenRow, Expressions.RepeatingGroup.hiddenRow);
    return useMemo(
      () => rows.filter((row) => !isHidden(getRepeatingRowReference(groupBinding, row.index))),
      [groupBinding, isHidden, rows],
    );
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

  /** Static candidates only; readOnly expressions are evaluated by the candidate's edit button. */
  useEditableChildCandidates(baseComponentId: string, editButton: boolean, hiddenColumns: string[]): string[] {
    const childrenBaseIds = RepGroupHooks.useChildIds(baseComponentId);
    const layoutLookups = FormStore.bootstrap.useLayoutLookups();
    const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const candidates: string[] = [];
    for (const childId of childrenBaseIds) {
      collectEditableChildren(childId, layoutLookups, config, hiddenColumns, editButton, candidates);
    }
    return candidates;
  },
};
