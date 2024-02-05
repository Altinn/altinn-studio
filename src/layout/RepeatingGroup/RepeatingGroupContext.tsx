import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';

import { createContext } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { FD } from 'src/features/formData/FormDataWrite';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { useOnDeleteGroupRow } from 'src/features/validation/validationContext';
import { useAsRef } from 'src/hooks/useAsRef';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { OpenByDefaultProvider } from 'src/layout/RepeatingGroup/OpenByDefaultProvider';
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

interface Store {
  editingAll: boolean;
  editingNone: boolean;
  editingIndex: number | undefined;
  deletingIndexes: number[];
  addingIndexes: number[];
}

interface ZustandHiddenMethods {
  startAddingRow: (idx: number) => void;
  endAddingRow: (idx: number) => void;
  startDeletingRow: (idx: number) => void;
  endDeletingRow: (idx: number, successful: boolean) => void;
}

interface ExtendedState {
  // If this is true, we're rendering the group for the first time in this context. This is used to
  // determine whether we should open the first/last row for editing when first displaying the group. If, however,
  // we run that effect every time the group is re-rendered, the user would be unable to close the row for editing.
  isFirstRender: boolean;

  // Methods for getting/setting state about which rows are in edit mode
  toggleEditing: (index: number) => void;
  openForEditing: (index: number) => void;
  openNextForEditing: () => void;
  closeForEditing: (index: number) => void;
}

type AddRowResult =
  | { result: 'stoppedByBinding'; index: undefined }
  | { result: 'stoppedByValidation'; index: undefined }
  | { result: 'addedAndOpened' | 'addedAndHidden'; index: number };

interface ContextMethods extends ExtendedState {
  addRow: () => Promise<AddRowResult>;
  deleteRow: (index: number) => Promise<boolean>;
  isEditing: (index: number) => boolean;
  isDeleting: (index: number) => boolean;
}

type ZustandState = Store & ZustandHiddenMethods & Omit<ExtendedState, 'toggleEditing'>;
type ExtendedContext = ContextMethods & Props & NodeState;

const ZStore = createZustandContext({
  name: 'RepeatingGroupZ',
  required: true,
  initialCreateStore: newStore,
});

const ExtendedStore = createContext<ExtendedContext>({
  name: 'RepeatingGroup',
  required: true,
});

interface NodeState {
  numVisibleRows: number;
  visibleRowIndexes: number[];
  hiddenRowIndexes: Set<number>;
  editableRowIndexes: number[];
  deletableRowIndexes: number[];
}

function produceStateFromNode(node: BaseLayoutNode<CompRepeatingGroupInternal>): NodeState {
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

  visible.sort();
  hidden.sort();
  editable.sort();
  deletable.sort();

  return {
    numVisibleRows: visible.length,
    visibleRowIndexes: visible,
    hiddenRowIndexes: new Set(hidden),
    editableRowIndexes: editable,
    deletableRowIndexes: deletable,
  };
}

interface NewStoreProps {
  nodeRef: React.MutableRefObject<BaseLayoutNode<CompRepeatingGroupInternal>>;
}

function newStore({ nodeRef }: NewStoreProps) {
  return createStore<ZustandState>((set) => ({
    editingAll: nodeRef.current.item.edit?.mode === 'showAll',
    editingNone: nodeRef.current.item.edit?.mode === 'onlyTable',
    isFirstRender: true,
    editingIndex: undefined,
    deletingIndexes: [],
    addingIndexes: [],

    closeForEditing: (idx) => {
      set((state) => {
        if (state.editingIndex === idx) {
          return { editingIndex: undefined };
        }
        return state;
      });
    },

    openForEditing: (idx) => {
      set((state) => {
        if (state.editingIndex === idx || state.editingAll || state.editingNone) {
          return state;
        }
        const { editableRowIndexes } = produceStateFromNode(nodeRef.current);
        if (!editableRowIndexes.includes(idx)) {
          return state;
        }
        return { editingIndex: idx };
      });
    },

    openNextForEditing: () => {
      set((state) => {
        if (state.editingAll || state.editingNone) {
          return state;
        }
        const { editableRowIndexes } = produceStateFromNode(nodeRef.current);
        if (state.editingIndex === undefined) {
          return { editingIndex: editableRowIndexes[0] };
        }
        const isLast = state.editingIndex === editableRowIndexes[editableRowIndexes.length - 1];
        if (isLast) {
          return { editingIndex: undefined };
        }
        return { editingIndex: editableRowIndexes[editableRowIndexes.indexOf(state.editingIndex) + 1] };
      });
    },

    startAddingRow: (idx) => {
      set((state) => {
        if (state.addingIndexes.includes(idx)) {
          return state;
        }
        return { addingIndexes: [...state.addingIndexes, idx], editingIndex: undefined };
      });
    },

    endAddingRow: (idx) => {
      set((state) => {
        const i = state.addingIndexes.indexOf(idx);
        if (i === -1) {
          return state;
        }
        return { addingIndexes: [...state.addingIndexes.slice(0, i), ...state.addingIndexes.slice(i + 1)] };
      });
    },

    startDeletingRow: (idx) => {
      set((state) => {
        if (state.deletingIndexes.includes(idx)) {
          return state;
        }
        return { deletingIndexes: [...state.deletingIndexes, idx] };
      });
    },

    endDeletingRow: (idx, successful) => {
      set((state) => {
        const isEditing = state.editingIndex === idx;
        const i = state.deletingIndexes.indexOf(idx);
        if (i === -1 && !isEditing) {
          return state;
        }
        const deletingIndexes = [...state.deletingIndexes.slice(0, i), ...state.deletingIndexes.slice(i + 1)];
        if (isEditing && successful) {
          return { editingIndex: undefined, deletingIndexes };
        }
        return {
          deletingIndexes,
          editingIndex: isEditing && successful ? undefined : state.editingIndex,
        };
      });
    },
  }));
}

function useExtendedRepeatingGroupState(node: BaseLayoutNode<CompRepeatingGroupInternal>): ExtendedContext {
  const nodeRef = useAsRef(node);
  const state = ZStore.useSelector((state) => state);
  const stateRef = useAsRef(state);

  const appendToList = FD.useAppendToList();
  const removeIndexFromList = FD.useRemoveIndexFromList();
  const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(node);
  const onDeleteGroupRow = useOnDeleteGroupRow();
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const waitForNode = useWaitForState(nodeRef);
  const nodeState = produceStateFromNode(node);
  const nodeStateRef = useAsRef(nodeState);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useLayoutEffect(() => {
    setIsFirstRender(false);
  }, []);

  const editingIndex = state.editingIndex;
  const editingIsHidden = editingIndex !== undefined && !nodeState.visibleRowIndexes.includes(editingIndex);
  useEffect(() => {
    if (editingIndex !== undefined && editingIsHidden) {
      stateRef.current.closeForEditing(editingIndex);
    }
  }, [editingIndex, editingIsHidden, stateRef]);

  const maybeValidateRow = useCallback(() => {
    const { editingAll, editingIndex, editingNone } = stateRef.current;
    const validateOnSaveRow = nodeRef.current.item.validateOnSaveRow;
    if (!validateOnSaveRow || editingAll || editingNone || editingIndex === undefined) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(nodeRef.current, editingIndex, validateOnSaveRow);
  }, [nodeRef, onGroupCloseValidation, stateRef]);

  const openForEditing = useCallback(
    async (index: number) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.openForEditing(index);
    },
    [maybeValidateRow, stateRef],
  );

  const openNextForEditing = useCallback(async () => {
    if (await maybeValidateRow()) {
      return;
    }
    stateRef.current.openNextForEditing();
  }, [maybeValidateRow, stateRef]);

  const closeForEditing = useCallback(
    async (index: number) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.closeForEditing(index);
    },
    [maybeValidateRow, stateRef],
  );

  const toggleEditing = useCallback(
    async (index: number) => {
      if (await maybeValidateRow()) {
        return;
      }
      const { editingIndex, closeForEditing, openForEditing } = stateRef.current;
      if (editingIndex === index) {
        closeForEditing(index);
      } else {
        openForEditing(index);
      }
    },
    [maybeValidateRow, stateRef],
  );

  const isEditing = useCallback(
    (index: number) => {
      const { editingAll, editingIndex, editingNone } = stateRef.current;
      if (editingAll) {
        return true;
      }
      if (editingNone) {
        return false;
      }
      return editingIndex === index;
    },
    [stateRef],
  );

  const addRow = useCallback(async (): Promise<AddRowResult> => {
    const binding = nodeRef.current.item.dataModelBindings.group;
    const { startAddingRow, endAddingRow } = stateRef.current;
    if (!binding) {
      return { result: 'stoppedByBinding', index: undefined };
    }
    if (await maybeValidateRow()) {
      return { result: 'stoppedByValidation', index: undefined };
    }
    const nextIndex = nodeRef.current.item.rows.length;
    startAddingRow(nextIndex);
    appendToList({
      path: binding,
      newValue: {},
    });
    await waitForNode((node) => node.item.rows.some((row) => row.index === nextIndex));
    endAddingRow(nextIndex);
    if (nodeStateRef.current.visibleRowIndexes.includes(nextIndex)) {
      await openForEditing(nextIndex);
      return { result: 'addedAndOpened', index: nextIndex };
    }

    return { result: 'addedAndHidden', index: nextIndex };
  }, [appendToList, maybeValidateRow, nodeRef, nodeStateRef, openForEditing, stateRef, waitForNode]);

  const deleteRow = useCallback(
    async (index: number) => {
      const binding = nodeRef.current.item.dataModelBindings.group;
      const { deletableRowIndexes } = nodeStateRef.current;
      const { startDeletingRow, endDeletingRow } = stateRef.current;
      if (!deletableRowIndexes.includes(index)) {
        return false;
      }

      startDeletingRow(index);
      const attachmentDeletionSuccessful = await onBeforeRowDeletion(index);
      if (attachmentDeletionSuccessful && binding) {
        onDeleteGroupRow(nodeRef.current, index);
        removeIndexFromList({
          path: binding,
          index,
        });

        endDeletingRow(index, true);
        return true;
      }

      endDeletingRow(index, false);
      return false;
    },
    [nodeRef, nodeStateRef, onBeforeRowDeletion, onDeleteGroupRow, removeIndexFromList, stateRef],
  );

  const isDeleting = useCallback((index: number) => stateRef.current.deletingIndexes.includes(index), [stateRef]);

  return {
    node,
    addRow,
    deleteRow,
    isDeleting,
    closeForEditing,
    isEditing,
    openForEditing,
    openNextForEditing,
    toggleEditing,
    isFirstRender,
    ...nodeState,
  };
}

function ProvideTheRest({ node, children }: PropsWithChildren<Props>) {
  const extended = useExtendedRepeatingGroupState(node);
  return <ExtendedStore.Provider value={extended}>{children}</ExtendedStore.Provider>;
}

interface Props {
  node: BaseLayoutNode<CompRepeatingGroupInternal>;
}

export function RepeatingGroupProvider({ node, children }: PropsWithChildren<Props>) {
  const nodeRef = useAsRef(node);
  return (
    <ZStore.Provider nodeRef={nodeRef}>
      <ProvideTheRest node={node}>
        <OpenByDefaultProvider node={node}>{children}</OpenByDefaultProvider>
      </ProvideTheRest>
    </ZStore.Provider>
  );
}

export const useRepeatingGroup = () => ExtendedStore.useCtx();
export const useRepeatingGroupNode = () => ExtendedStore.useCtx().node;
export function useRepeatingGroupSelector<T>(selector: (state: Store) => T): T {
  return ZStore.useMemoSelector(selector);
}
