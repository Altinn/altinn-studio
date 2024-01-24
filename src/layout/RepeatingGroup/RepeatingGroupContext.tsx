import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { FD } from 'src/features/formData/FormDataWrite';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { useOnDeleteGroupRow } from 'src/features/validation/validationContext';
import { useAsRef, useAsRefObject } from 'src/hooks/useAsRef';
import { useMemoDeepEqual } from 'src/hooks/useStateDeepEqual';
import { useWaitForState } from 'src/hooks/useWaitForState';
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

interface RepeatingGroupContext {
  node: BaseLayoutNode<CompRepeatingGroupInternal>;

  // If this is true, we're rendering the group for the first time in this context. This is used to
  // determine whether we should open the first/last row for editing when first displaying the group. If, however,
  // we run that effect every time the group is re-rendered, the user would be unable to close the row for editing.
  isFirstRender: boolean;

  // Methods for getting/setting state about which rows are in edit mode
  toggleEditing: (index: number) => void;
  openForEditing: (index: number) => void;
  openNextForEditing: () => void;
  closeForEditing: (index: number) => void;
  isEditing: (index: number) => boolean;
  isEditingAnyRow: boolean;
  editingIndex: number | undefined;

  addRow: () => Promise<void>;

  deleteRow: (index: number) => Promise<boolean>;
  isDeleting: (index: number) => boolean;

  numVisibleRows: number;
  visibleRowIndexes: number[];
  hiddenRowIndexes: Set<number>;
  moreVisibleRowsAfterEditIndex: boolean;
  editableRowIndexes: number[];
  deletableRowIndexes: number[];
}

const { Provider, useCtx } = createContext<RepeatingGroupContext>({
  name: 'RepeatingGroup',
  required: true,
});

function usePureStates(node: BaseLayoutNode<CompRepeatingGroupInternal>) {
  const editingAll = node.item.edit?.mode === 'showAll';
  const editingNone = node.item.edit?.mode === 'onlyTable';
  const binding = node.item.dataModelBindings?.group;

  const [visibleRowIndexes, hiddenRowIndexes, editableRowIndexes, deletableRowIndexes] = useMemoDeepEqual(() => {
    const hidden: number[] = [];
    const visible: number[] = [];
    const editable: number[] = [];
    const deletable: number[] = [];
    for (const row of node.item.rows) {
      if (row.groupExpressions?.hiddenRow) {
        hidden.push(row.index);
      } else {
        visible.push(row.index);

        // Only the visible rows can be edited or deleted
        if (row.groupExpressions?.edit?.editButton !== false) {
          editable.push(row.index);
        }
        if (row.groupExpressions?.edit?.deleteButton !== false) {
          deletable.push(row.index);
        }
      }
    }

    return [visible, new Set(hidden), editable, deletable];
  }, [node.item.rows]);

  const [isFirstRender, setIsFirstRender] = useState(true);
  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  const [editingIndex, setEditingIndex] = useState<number | undefined>(undefined);
  const [deletingIndexes, setDeletingIndexes] = useState<number[]>([]);

  return {
    editingAll,
    editingNone,
    numVisibleRows: visibleRowIndexes.length,
    hiddenRowIndexes,
    visibleRowIndexes,
    editableRowIndexes,
    deletableRowIndexes,
    isFirstRender,
    editingIndex,
    setEditingIndex,
    deletingIndexes,
    setDeletingIndexes,
    binding,
  };
}

function useRepeatingGroupState(node: BaseLayoutNode<CompRepeatingGroupInternal>): RepeatingGroupContext {
  const appendToList = FD.useAppendToList();
  const removeIndexFromList = FD.useRemoveIndexFromList();
  const { onBeforeRowDeletion } = useAttachmentDeletionInRepGroups(node);
  const onDeleteGroupRow = useOnDeleteGroupRow();
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const pureStates = usePureStates(node);
  const setEditingIndex = pureStates.setEditingIndex;
  const {
    editingAll,
    editingNone,
    binding,
    setDeletingIndexes,
    deletingIndexes,
    editableRowIndexes,
    deletableRowIndexes,
    editingIndex,
  } = useAsRefObject(pureStates);
  const nodeRef = useAsRef(node);
  const waitForNode = useWaitForState(nodeRef);

  const validateOnSaveRow = nodeRef.current.item.validateOnSaveRow;

  const maybeValidateRow = useCallback(() => {
    if (!validateOnSaveRow || editingAll.current || editingNone.current || editingIndex.current === undefined) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(nodeRef.current, editingIndex.current, validateOnSaveRow);
  }, [editingAll, editingIndex, editingNone, nodeRef, onGroupCloseValidation, validateOnSaveRow]);

  // Figure out if the row we were editing is now hidden, and in that case, reset the editing state
  useEffect(() => {
    if (pureStates.editingIndex !== undefined && pureStates.hiddenRowIndexes.has(pureStates.editingIndex)) {
      setEditingIndex(undefined);
    }
  }, [pureStates.editingIndex, pureStates.hiddenRowIndexes, node, setEditingIndex]);

  const toggleEditing = useCallback(
    async (index: number) => {
      if (editingAll.current || editingNone.current || !editableRowIndexes.current.includes(index)) {
        return;
      }
      if (await maybeValidateRow()) {
        return;
      }
      setEditingIndex((prev) => (prev === index ? undefined : index));
    },
    [editableRowIndexes, editingAll, editingNone, maybeValidateRow, setEditingIndex],
  );

  const openForEditing = useCallback(
    async (index: number) => {
      if (editingAll.current || editingNone.current || !editableRowIndexes.current.includes(index)) {
        return;
      }
      if (await maybeValidateRow()) {
        return;
      }
      setEditingIndex(index);
    },
    [editableRowIndexes, editingAll, editingNone, maybeValidateRow, setEditingIndex],
  );

  const openNextForEditing = useCallback(async () => {
    if (editingAll.current || editingNone.current) {
      return;
    }
    if (await maybeValidateRow()) {
      return;
    }
    setEditingIndex((prev) => {
      if (prev === undefined) {
        return editableRowIndexes.current[0];
      }
      const isLast = prev === editableRowIndexes.current[editableRowIndexes.current.length - 1];
      if (isLast) {
        return undefined;
      }
      return editableRowIndexes.current[editableRowIndexes.current.indexOf(prev) + 1];
    });
  }, [editableRowIndexes, editingAll, editingNone, maybeValidateRow, setEditingIndex]);

  const closeForEditing = useCallback(
    async (index: number) => {
      if (editingAll.current || editingNone.current) {
        return;
      }
      if (editingIndex.current === index && !(await maybeValidateRow())) {
        setEditingIndex(undefined);
      }
    },
    [editingAll, editingIndex, editingNone, maybeValidateRow, setEditingIndex],
  );

  const isEditing = useCallback(
    (index: number) => {
      if (editingAll.current) {
        return true;
      }
      if (editingNone.current) {
        return false;
      }
      return editingIndex.current === index;
    },
    [editingAll, editingIndex, editingNone],
  );

  const addingRowRef = useRef<number | false>(false);
  const addRow = useCallback(async () => {
    if (binding.current && !(await maybeValidateRow()) && addingRowRef.current === false) {
      const nextIndex = nodeRef.current.item.rows.length;
      const nextLength = nextIndex + 1;
      addingRowRef.current = nextIndex;
      appendToList({
        path: binding.current,
        newValue: {},
      });
      await waitForNode((node) => node.item.rows.length === nextLength);
      await openForEditing(nextIndex);
      addingRowRef.current = false;
    }
  }, [appendToList, binding, maybeValidateRow, nodeRef, openForEditing, waitForNode]);

  const deleteRow = useCallback(
    async (index: number) => {
      if (!deletableRowIndexes.current.includes(index)) {
        return false;
      }

      setDeletingIndexes.current((prev) => {
        if (prev.includes(index)) {
          return prev;
        }
        return [...prev, index];
      });
      const attachmentDeletionSuccessful = await onBeforeRowDeletion(index);
      if (attachmentDeletionSuccessful && binding.current) {
        onDeleteGroupRow(nodeRef.current, index);
        removeIndexFromList({
          path: binding.current,
          index,
        });

        setEditingIndex((prev) => {
          if (prev === index) {
            return undefined;
          }
          return prev;
        });
        setDeletingIndexes.current((prev) => {
          const idx = prev.indexOf(index);
          if (idx === -1) {
            return prev;
          }
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });

        return true;
      }

      return false;
    },
    [
      binding,
      deletableRowIndexes,
      nodeRef,
      onBeforeRowDeletion,
      onDeleteGroupRow,
      removeIndexFromList,
      setDeletingIndexes,
      setEditingIndex,
    ],
  );

  const isDeleting = useCallback((index: number) => deletingIndexes.current.includes(index), [deletingIndexes]);

  const moreVisibleRowsAfterEditIndex = useMemo(() => {
    if (pureStates.editingIndex === undefined) {
      return false;
    }
    return pureStates.visibleRowIndexes.indexOf(pureStates.editingIndex) < pureStates.visibleRowIndexes.length - 1;
  }, [pureStates.visibleRowIndexes, pureStates.editingIndex]);

  return {
    node,
    isFirstRender: pureStates.isFirstRender,
    toggleEditing,
    openForEditing,
    openNextForEditing,
    closeForEditing,
    isEditing,
    isEditingAnyRow: pureStates.editingAll
      ? true
      : pureStates.editingNone
        ? false
        : pureStates.editingIndex !== undefined,
    editingIndex: pureStates.editingIndex,
    numVisibleRows: pureStates.numVisibleRows,
    visibleRowIndexes: pureStates.visibleRowIndexes,
    hiddenRowIndexes: pureStates.hiddenRowIndexes,
    editableRowIndexes: pureStates.editableRowIndexes,
    deletableRowIndexes: pureStates.deletableRowIndexes,
    moreVisibleRowsAfterEditIndex,
    addRow,
    deleteRow,
    isDeleting,
  };
}

interface Props {
  node: BaseLayoutNode<CompRepeatingGroupInternal>;
}

export function RepeatingGroupProvider({ node, children }: PropsWithChildren<Props>) {
  const state = useRepeatingGroupState(node);
  return <Provider value={state}>{children}</Provider>;
}

export const useRepeatingGroup = () => useCtx();
