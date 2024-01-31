import React, { useCallback, useEffect, useRef } from 'react';
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
import type { CompRepeatingGroupInternal } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

interface Store {
  editingAll: boolean;
  editingNone: boolean;
  binding: string;
  deletingIndexes: number[];
  editingIndex: number | undefined;

  // If this is true, we're rendering the group for the first time in this context. This is used to
  // determine whether we should open the first/last row for editing when first displaying the group. If, however,
  // we run that effect every time the group is re-rendered, the user would be unable to close the row for editing.
  isFirstRender: boolean;

  numVisibleRows: number;
  visibleRowIndexes: number[];
  hiddenRowIndexes: Set<number>;
  editableRowIndexes: number[];
  deletableRowIndexes: number[];
  currentlyAddingRow: undefined | number;
}

interface ZustandHiddenMethods {
  updateNode: (n: BaseLayoutNode<CompRepeatingGroupInternal>) => void;
  startAddingRow: (idx: number) => void;
  endAddingRow: (idx: number) => void;
  startDeletingRow: (idx: number) => void;
  endDeletingRow: (idx: number, successful: boolean) => void;
}

interface ExtendedMethods {
  // Methods for getting/setting state about which rows are in edit mode
  toggleEditing: (index: number) => void;
  openForEditing: (index: number) => void;
  openNextForEditing: () => void;
  closeForEditing: (index: number) => void;
}

interface ContextMethods extends ExtendedMethods {
  addRow: () => Promise<void>;
  deleteRow: (index: number) => Promise<boolean>;
  isEditing: (index: number) => boolean;
  isDeleting: (index: number) => boolean;
}

type ZustandState = Store & ZustandHiddenMethods & Omit<ExtendedMethods, 'toggleEditing'>;
type ExtendedContext = ContextMethods & Props;

const ZStore = createZustandContext({
  name: 'RepeatingGroupZ',
  required: true,
  initialCreateStore: newStore,
  onReRender: (store, { node }) => {
    store.getState().updateNode(node);
  },
});

const ExtendedStore = createContext<ExtendedContext>({
  name: 'RepeatingGroup',
  required: true,
});

function newStore({ node }: Props) {
  return createStore<ZustandState>((set) => {
    function produceRowIndexes(n: BaseLayoutNode<CompRepeatingGroupInternal>) {
      const hidden: number[] = [];
      const visible: number[] = [];
      const editable: number[] = [];
      const deletable: number[] = [];
      for (const row of n.item.rows) {
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

      return [visible, new Set(hidden), editable, deletable] as const;
    }

    const [visibleRowIndexes, hiddenRowIndexes, editableRowIndexes, deletableRowIndexes] = produceRowIndexes(node);

    return {
      editingAll: node.item.edit?.mode === 'showAll',
      editingNone: node.item.edit?.mode === 'onlyTable',
      binding: node.item.dataModelBindings.group,
      isFirstRender: true,
      editingIndex: undefined,
      numVisibleRows: visibleRowIndexes.length,
      deletingIndexes: [],
      currentlyAddingRow: undefined,

      visibleRowIndexes,
      hiddenRowIndexes,
      editableRowIndexes,
      deletableRowIndexes,

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
          if (!state.editableRowIndexes.includes(idx)) {
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
          if (state.editingIndex === undefined) {
            return { editingIndex: state.editableRowIndexes[0] };
          }
          const isLast = state.editingIndex === state.editableRowIndexes[state.editableRowIndexes.length - 1];
          if (isLast) {
            return { editingIndex: undefined };
          }
          return { editingIndex: state.editableRowIndexes[state.editableRowIndexes.indexOf(state.editingIndex) + 1] };
        });
      },

      startAddingRow: (idx) => {
        set((state) => {
          if (state.currentlyAddingRow !== undefined) {
            return state;
          }
          return { currentlyAddingRow: idx, editingIndex: undefined };
        });
      },

      endAddingRow: (idx) => {
        set((state) => {
          if (state.currentlyAddingRow !== idx) {
            return state;
          }
          return { currentlyAddingRow: undefined };
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
          if (isEditing && successful) {
            return { editingIndex: undefined };
          }
          return {
            deletingIndexes: [...state.deletingIndexes.slice(0, i), ...state.deletingIndexes.slice(i + 1)],
            editingIndex: isEditing && successful ? undefined : state.editingIndex,
          };
        });
      },

      updateNode: (n: BaseLayoutNode<CompRepeatingGroupInternal>) => {
        const [visibleRowIndexes, hiddenRowIndexes, editableRowIndexes, deletableRowIndexes] = produceRowIndexes(n);
        set((state) => {
          const newState: Partial<ZustandState> = {
            binding: n.item.dataModelBindings.group,
            visibleRowIndexes,
            hiddenRowIndexes,
            editableRowIndexes,
            deletableRowIndexes,
          };
          if (state.editingIndex !== undefined && !visibleRowIndexes.includes(state.editingIndex)) {
            newState.editingIndex = undefined;
          }
          if (state.isFirstRender) {
            newState.isFirstRender = false;
          }
          return newState;
        });
      },
    };
  });
}

function useExtendedRepeatingGroupState(node: BaseLayoutNode<CompRepeatingGroupInternal>): ExtendedContext {
  const nodeRef = useAsRef(node);
  const stateRef = useAsRef(ZStore.useSelector((state) => state));

  const appendToList = FD.useAppendToList();
  const removeIndexFromList = FD.useRemoveIndexFromList();
  const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(node);
  const onDeleteGroupRow = useOnDeleteGroupRow();
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const waitForNode = useWaitForState(nodeRef);

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

  const addRow = useCallback(async () => {
    const { binding, currentlyAddingRow, startAddingRow, endAddingRow } = stateRef.current;
    if (binding && !currentlyAddingRow && !(await maybeValidateRow())) {
      const nextIndex = nodeRef.current.item.rows.length;
      const nextLength = nextIndex + 1;
      startAddingRow(nextIndex);
      appendToList({
        path: binding,
        newValue: {},
      });
      await waitForNode((node) => node.item.rows.length === nextLength);
      await openForEditing(nextIndex);
      endAddingRow(nextIndex);
    }
  }, [appendToList, maybeValidateRow, nodeRef, openForEditing, stateRef, waitForNode]);

  const deleteRow = useCallback(
    async (index: number) => {
      const { binding, deletableRowIndexes, startDeletingRow, endDeletingRow } = stateRef.current;
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
    [nodeRef, onBeforeRowDeletion, onDeleteGroupRow, removeIndexFromList, stateRef],
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
  };
}

function ProvideTheRest({ node, children }: PropsWithChildren<Props>) {
  const extended = useExtendedRepeatingGroupState(node);
  return <ExtendedStore.Provider value={extended}>{children}</ExtendedStore.Provider>;
}

function OpenByDefaultProvider({ node, children }: PropsWithChildren<Props>) {
  const openByDefault = node.item.edit?.openByDefault;
  const { addRow, openForEditing } = useRepeatingGroup();
  const { editingIndex, isFirstRender, visibleRowIndexes } = useRepeatingGroupSelector((state) => ({
    editingIndex: state.editingIndex,
    isFirstRender: state.isFirstRender,
    visibleRowIndexes: state.visibleRowIndexes,
  }));

  const numRows = visibleRowIndexes.length;
  const firstIndex = visibleRowIndexes[0];
  const lastIndex = visibleRowIndexes[numRows - 1];

  // Making sure we don't add a row while we're already adding one
  const working = useRef(false);

  // Add new row if openByDefault is true and no rows exist. This also makes sure to add a row immediately after the
  // last one has been deleted.
  useEffect((): void => {
    if (openByDefault && numRows === 0 && !working.current) {
      working.current = true;
      addRow().then(() => {
        working.current = false;
      });
    }
  }, [node, addRow, openByDefault, numRows]);

  // Open the first or last row for editing, if openByDefault is set to 'first' or 'last'
  useEffect((): void => {
    if (
      isFirstRender &&
      openByDefault &&
      typeof openByDefault === 'string' &&
      ['first', 'last'].includes(openByDefault) &&
      editingIndex === undefined
    ) {
      const index = openByDefault === 'last' ? lastIndex : firstIndex;
      openForEditing(index);
    }
  }, [openByDefault, editingIndex, isFirstRender, firstIndex, lastIndex, openForEditing]);

  return <>{children}</>;
}

interface Props {
  node: BaseLayoutNode<CompRepeatingGroupInternal>;
}

export function RepeatingGroupProvider({ node, children }: PropsWithChildren<Props>) {
  return (
    <ZStore.Provider node={node}>
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
