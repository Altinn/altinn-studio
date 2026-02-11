import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { SearchParams } from 'src/core/routing/types';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import { useAsRef } from 'src/hooks/useAsRef';
import {
  RepGroupContext,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { splitDashedKey } from 'src/utils/splitDashedKey';

interface Props {
  baseComponentId: string;
}

export function OpenByDefaultProvider({ baseComponentId, children }: PropsWithChildren<Props>) {
  const item = useItemWhenType(baseComponentId, 'RepeatingGroup');
  const openByDefault = item.edit?.openByDefault;
  const isFirstRender = useRef(true);
  const addRow = RepGroupContext.useAddRow();
  const openForEditing = RepGroupContext.useOpenForEditing();
  const { visibleRows } = useRepeatingGroupRowState();
  const state = useRepeatingGroupSelector((state) => ({
    editingId: state.editingId,
    addingIds: state.addingIds,
  }));

  const hasNoRows = visibleRows.length === 0;
  const stateRef = useAsRef({
    ...state,
    firstRow: hasNoRows ? undefined : visibleRows[0],
    lastRow: hasNoRows ? undefined : visibleRows[visibleRows.length - 1],
    addRow,
    openForEditing,
    canAddRows: item.edit?.addButton ?? true,
  });

  // When this is true, the group won't try to add more rows using openByDefault. This will reset again
  // when the component is unmounted and mounted again, i.e. when the user navigates away and back to the page.
  const hasAddedRow = useRef(false);

  const isFocusingChildRef = useAsRef(useIsFocussingAChild(baseComponentId));

  useEffect((): void => {
    (async () => {
      if (hasAddedRow.current) {
        // Never run more than once
        return;
      }

      // Add new row if openByDefault is true and no (visible) rows exist. This also makes sure to add a row
      // immediately after the last one has been deleted.
      const { canAddRows } = stateRef.current;
      if (isFirstRender.current && openByDefault && hasNoRows && canAddRows) {
        hasAddedRow.current = true;
        const { result } = await addRow();
        if (result !== 'addedAndOpened') {
          window.logWarn(
            `openByDefault for repeating group '${baseComponentId}' returned '${result}'. You may have rules that make it ` +
              `impossible to add a new blank row, or open the added row for editing, such as a restrictive ` +
              `hiddenRow expression. You probably want to disable openByDefault for this group, as openByDefault ` +
              `might create empty and invisible rows before it will disable itself. openByDefault will be disabled ` +
              'temporarily for this group.',
          );
        }
      }

      // Open the first or last row for editing, if openByDefault is set to 'first' or 'last'
      const { editingId, firstRow, lastRow, openForEditing } = stateRef.current;
      if (
        isFirstRender.current &&
        openByDefault &&
        typeof openByDefault === 'string' &&
        ['first', 'last'].includes(openByDefault) &&
        editingId === undefined &&
        !isFocusingChildRef.current
      ) {
        const row = openByDefault === 'last' ? lastRow : firstRow;
        row !== undefined && openForEditing(row);
      }

      if (isFirstRender.current) {
        isFirstRender.current = false;
      }
    })();
  }, [openByDefault, stateRef, addRow, baseComponentId, hasNoRows, isFocusingChildRef]);

  return children;
}

/**
 * Hook that returns true if we are about to focus on a child component (or a nested child component) of ours
 * @param baseComponentId
 */
function useIsFocussingAChild(baseComponentId: string): boolean {
  const focusComponentId = useSearchParams()[0].get(SearchParams.FocusComponentId);
  const layoutLookups = FormBootstrap.useLayoutLookups();
  if (!focusComponentId) {
    return false;
  }

  const { baseComponentId: baseFocusId } = splitDashedKey(focusComponentId);
  let parent = layoutLookups.componentToParent[baseFocusId];
  while (parent && parent.type === 'node') {
    if (parent.id === baseComponentId) {
      return true;
    }
    parent = layoutLookups.componentToParent[parent.id];
  }

  return false;
}
