import React, { useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { useAsRef } from 'src/hooks/useAsRef';
import { useRepeatingGroup, useRepeatingGroupSelector } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

interface Props {
  node: BaseLayoutNode<CompRepeatingGroupInternal>;
}

export function OpenByDefaultProvider({ node, children }: PropsWithChildren<Props>) {
  const groupId = node.item.id;
  const openByDefault = node.item.edit?.openByDefault;
  const { addRow, openForEditing, visibleRows, isFirstRender } = useRepeatingGroup();
  const state = useRepeatingGroupSelector((state) => ({
    editingId: state.editingId,
    addingIds: state.addingIds,
  }));

  const hasNoRows = visibleRows.length === 0;
  const stateRef = useAsRef({
    ...state,
    firstId: hasNoRows ? undefined : visibleRows[0].uuid,
    lastId: hasNoRows ? undefined : visibleRows[visibleRows.length - 1].uuid,
    addRow,
    openForEditing,
    canAddRows: node.item.edit?.addButton ?? true,
  });

  // When this is true, the group won't try to add more rows using openByDefault. This will reset again
  // when the component is unmounted and mounted again, i.e. when the user navigates away and back to the page.
  const hasAddedRow = useRef(false);

  useEffect((): void => {
    (async () => {
      if (hasAddedRow.current) {
        // Never run more than once
        return;
      }

      // Add new row if openByDefault is true and no (visible) rows exist. This also makes sure to add a row
      // immediately after the last one has been deleted.
      const { canAddRows } = stateRef.current;
      if (isFirstRender && openByDefault && hasNoRows && canAddRows) {
        hasAddedRow.current = true;
        const { result } = await addRow();
        if (result !== 'addedAndOpened') {
          window.logWarn(
            `openByDefault for repeating group '${groupId}' returned '${result}'. You may have rules that make it ` +
              `impossible to add a new blank row, or open the added row for editing, such as a restrictive ` +
              `hiddenRow expression. You probably want to disable openByDefault for this group, as openByDefault ` +
              `might create empty and invisible rows before it will disable itself. openByDefault will be disabled ` +
              'temporarily for this group.',
          );
        }
      }

      // Open the first or last row for editing, if openByDefault is set to 'first' or 'last'
      const { editingId, firstId, lastId, openForEditing } = stateRef.current;
      if (
        isFirstRender &&
        openByDefault &&
        typeof openByDefault === 'string' &&
        ['first', 'last'].includes(openByDefault) &&
        editingId === undefined
      ) {
        const uuid = openByDefault === 'last' ? lastId : firstId;
        uuid !== undefined && openForEditing(uuid);
      }
    })();
  }, [openByDefault, stateRef, addRow, groupId, hasNoRows, isFirstRender]);

  return <>{children}</>;
}
