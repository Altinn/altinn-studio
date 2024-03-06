import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'zustand';

import { createContext } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { Validation } from 'src/features/validation/validationContext';
import { useAsRef } from 'src/hooks/useAsRef';
import { useWaitForState } from 'src/hooks/useWaitForState';
import { OpenByDefaultProvider } from 'src/layout/RepeatingGroup/OpenByDefaultProvider';
import type { CompRepeatingGroupInternal, HRepGroupRow } from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

interface Store {
  editingAll: boolean;
  editingNone: boolean;
  editingId: string | undefined;
  deletingIds: string[];
  addingIds: string[];
}

interface ZustandHiddenMethods {
  startAddingRow: (uuid: string) => void;
  endAddingRow: (uuid: string) => void;
  startDeletingRow: (uuid: string) => void;
  endDeletingRow: (uuid: string, successful: boolean) => void;
}

interface ExtendedState {
  // If this is true, we're rendering the group for the first time in this context. This is used to
  // determine whether we should open the first/last row for editing when first displaying the group. If, however,
  // we run that effect every time the group is re-rendered, the user would be unable to close the row for editing.
  isFirstRender: boolean;

  // Methods for getting/setting state about which rows are in edit mode
  toggleEditing: (uuid: string) => void;
  openForEditing: (uuid: string) => void;
  openNextForEditing: () => void;
  closeForEditing: (uuid: string) => void;
}

type AddRowResult =
  | { result: 'stoppedByBinding'; uuid: undefined; index: undefined }
  | { result: 'stoppedByValidation'; uuid: undefined; index: undefined }
  | { result: 'addedAndOpened' | 'addedAndHidden'; uuid: string; index: number };

interface ContextMethods extends ExtendedState {
  addRow: () => Promise<AddRowResult>;
  deleteRow: (uuid: string) => Promise<boolean>;
  isEditing: (uuid: string) => boolean;
  isDeleting: (uuid: string) => boolean;
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

interface Row {
  index: number;
  uuid: string;
}

interface NodeState {
  numVisibleRows: number;
  visibleRows: Row[];
  hiddenRows: Row[];
  editableRows: Row[];
  deletableRows: Row[];
}

function produceStateFromNode(node: BaseLayoutNode<CompRepeatingGroupInternal>): NodeState {
  const hidden: Row[] = [];
  const visible: Row[] = [];
  const editable: Row[] = [];
  const deletable: Row[] = [];
  for (const row of node.item.rows) {
    const rowObj: Row = {
      index: row.index,
      uuid: row.uuid,
    };

    if (row.groupExpressions?.hiddenRow) {
      hidden.push(rowObj);
    } else {
      visible.push(rowObj);

      // Only the visible rows can be edited or deleted
      if (row.groupExpressions?.edit?.editButton !== false) {
        editable.push(rowObj);
      }
      if (row.groupExpressions?.edit?.deleteButton !== false) {
        deletable.push(rowObj);
      }
    }
  }

  for (const toSort of [visible, hidden, editable, deletable]) {
    // Sort by index
    toSort.sort((a, b) => a.index - b.index);
  }

  return {
    numVisibleRows: visible.length,
    visibleRows: visible,
    hiddenRows: hidden,
    editableRows: editable,
    deletableRows: deletable,
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
    editingId: undefined,
    deletingIds: [],
    addingIds: [],

    closeForEditing: (uuid) => {
      set((state) => {
        if (state.editingId === uuid) {
          return { editingId: undefined };
        }
        return state;
      });
    },

    openForEditing: (uuid) => {
      set((state) => {
        if (state.editingId === uuid || state.editingAll || state.editingNone) {
          return state;
        }
        const { editableRows } = produceStateFromNode(nodeRef.current);
        if (!editableRows.some((row) => row.uuid === uuid)) {
          return state;
        }
        return { editingId: uuid };
      });
    },

    openNextForEditing: () => {
      set((state) => {
        if (state.editingAll || state.editingNone) {
          return state;
        }
        const { editableRows } = produceStateFromNode(nodeRef.current);
        if (state.editingId === undefined) {
          const firstRow = editableRows[0];
          return { editingId: firstRow.uuid };
        }
        const isLast = state.editingId === editableRows[editableRows.length - 1].uuid;
        if (isLast) {
          return { editingId: undefined };
        }
        const currentIndex = editableRows.findIndex((row) => row.uuid === state.editingId);
        const nextRow = editableRows[currentIndex + 1];
        return { editingId: nextRow.uuid };
      });
    },

    startAddingRow: (uuid) => {
      set((state) => {
        if (state.addingIds.includes(uuid)) {
          return state;
        }
        return { addingIds: [...state.addingIds, uuid], editingId: undefined };
      });
    },

    endAddingRow: (uuid) => {
      set((state) => {
        const i = state.addingIds.indexOf(uuid);
        if (i === -1) {
          return state;
        }
        return { addingIds: [...state.addingIds.slice(0, i), ...state.addingIds.slice(i + 1)] };
      });
    },

    startDeletingRow: (uuid) => {
      set((state) => {
        if (state.deletingIds.includes(uuid)) {
          return state;
        }
        return { deletingIds: [...state.deletingIds, uuid] };
      });
    },

    endDeletingRow: (uuid, successful) => {
      set((state) => {
        const isEditing = state.editingId === uuid;
        const i = state.deletingIds.indexOf(uuid);
        if (i === -1 && !isEditing) {
          return state;
        }
        const deletingIds = [...state.deletingIds.slice(0, i), ...state.deletingIds.slice(i + 1)];
        if (isEditing && successful) {
          return { editingId: undefined, deletingIds };
        }
        return {
          deletingIds,
          editingId: isEditing && successful ? undefined : state.editingId,
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
  const removeFromList = FD.useRemoveFromListCallback();
  const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(node);
  const onDeleteGroupRow = Validation.useOnDeleteGroupRow();
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const waitForNode = useWaitForState<undefined, LayoutNode<'RepeatingGroup'>>(nodeRef);
  const nodeState = produceStateFromNode(node);
  const nodeStateRef = useAsRef(nodeState);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useLayoutEffect(() => {
    setIsFirstRender(false);
  }, []);

  const editingId = state.editingId;
  const editingIsHidden = editingId !== undefined && !nodeState.visibleRows.some((row) => row.uuid === editingId);
  useEffect(() => {
    if (editingId !== undefined && editingIsHidden) {
      stateRef.current.closeForEditing(editingId);
    }
  }, [editingId, editingIsHidden, stateRef]);

  const maybeValidateRow = useCallback(() => {
    const { editingAll, editingId, editingNone } = stateRef.current;
    const validateOnSaveRow = nodeRef.current.item.validateOnSaveRow;
    if (!validateOnSaveRow || editingAll || editingNone || editingId === undefined) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(nodeRef.current, editingId, validateOnSaveRow);
  }, [nodeRef, onGroupCloseValidation, stateRef]);

  const openForEditing = useCallback(
    async (uuid: string) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.openForEditing(uuid);
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
    async (uuid: string) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.closeForEditing(uuid);
    },
    [maybeValidateRow, stateRef],
  );

  const toggleEditing = useCallback(
    async (uuid: string) => {
      if (await maybeValidateRow()) {
        return;
      }
      const { editingId, closeForEditing, openForEditing } = stateRef.current;
      if (editingId === uuid) {
        closeForEditing(uuid);
      } else {
        openForEditing(uuid);
      }
    },
    [maybeValidateRow, stateRef],
  );

  const isEditing = useCallback(
    (uuid: string) => {
      const { editingAll, editingId, editingNone } = stateRef.current;
      if (editingAll) {
        return true;
      }
      if (editingNone) {
        return false;
      }
      return editingId === uuid;
    },
    [stateRef],
  );

  const addRow = useCallback(async (): Promise<AddRowResult> => {
    const binding = nodeRef.current.item.dataModelBindings.group;
    const { startAddingRow, endAddingRow } = stateRef.current;
    if (!binding) {
      return { result: 'stoppedByBinding', uuid: undefined, index: undefined };
    }
    if (await maybeValidateRow()) {
      return { result: 'stoppedByValidation', uuid: undefined, index: undefined };
    }
    const uuid = uuidv4();
    startAddingRow(uuid);
    appendToList({
      path: binding,
      newValue: { [ALTINN_ROW_ID]: uuid },
    });
    let foundRow: HRepGroupRow | undefined;
    await waitForNode((node) => {
      foundRow = node.item.rows.find((row) => row.uuid === uuid);
      return !!foundRow;
    });
    endAddingRow(uuid);
    const index = foundRow?.index ?? -1;
    if (nodeStateRef.current.visibleRows.some((row) => row.uuid === uuid)) {
      await openForEditing(uuid);
      return { result: 'addedAndOpened', uuid, index };
    }

    return { result: 'addedAndHidden', uuid, index };
  }, [appendToList, maybeValidateRow, nodeRef, nodeStateRef, openForEditing, stateRef, waitForNode]);

  const deleteRow = useCallback(
    async (uuid: string) => {
      const binding = nodeRef.current.item.dataModelBindings.group;
      const { deletableRows } = nodeStateRef.current;
      const { startDeletingRow, endDeletingRow } = stateRef.current;
      const row = deletableRows.find((row) => row.uuid === uuid);
      if (!row) {
        return false;
      }

      startDeletingRow(uuid);
      const attachmentDeletionSuccessful = await onBeforeRowDeletion(uuid);
      if (attachmentDeletionSuccessful && binding) {
        onDeleteGroupRow(nodeRef.current, row.index);
        removeFromList({
          path: binding,
          startAtIndex: row.index,
          callback: (item) => item[ALTINN_ROW_ID] === uuid,
        });

        endDeletingRow(uuid, true);
        return true;
      }

      endDeletingRow(uuid, false);
      return false;
    },
    [nodeRef, nodeStateRef, onBeforeRowDeletion, onDeleteGroupRow, removeFromList, stateRef],
  );

  const isDeleting = useCallback((uuid: string) => stateRef.current.deletingIds.includes(uuid), [stateRef]);

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
