import React, { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'zustand';

import { createContext } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { OpenByDefaultProvider } from 'src/layout/RepeatingGroup/Providers/OpenByDefaultProvider';
import { useNodeItem, useNodeItemRef, useWaitForNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompInternal } from 'src/layout/layout';
import type { IGroupEditProperties } from 'src/layout/RepeatingGroup/config.generated';
import type { RepGroupRow, RepGroupRows } from 'src/layout/RepeatingGroup/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseRow } from 'src/utils/layout/types';

interface Store {
  freshRowsRef: MutableRefObject<BaseRow[] | undefined>;
  editingAll: boolean;
  editingNone: boolean;
  editingId: string | undefined;
  deletingIds: string[];
  addingIds: string[];
  currentPage: number | undefined;
}

interface ZustandHiddenMethods {
  startAddingRow: (uuid: string) => void;
  endAddingRow: (uuid: string) => void;
  startDeletingRow: (row: BaseRow) => void;
  endDeletingRow: (row: BaseRow, successful: boolean) => void;
}

interface ExtendedState {
  // Methods for getting/setting state about which rows are in edit mode
  toggleEditing: (row: BaseRow) => void;
  openForEditing: (row: BaseRow) => void;
  openNextForEditing: () => void;
  closeForEditing: (row: BaseRow) => void;
  changePage: (page: number) => void;
}

type AddRowResult =
  | { result: 'stoppedByBinding'; uuid: undefined; index: undefined }
  | { result: 'stoppedByValidation'; uuid: undefined; index: undefined }
  | ({ result: 'addedAndOpened' | 'addedAndHidden' } & BaseRow);

interface ContextMethods extends ExtendedState {
  addRow: () => Promise<AddRowResult>;
  deleteRow: (row: BaseRow) => Promise<boolean>;
  isEditing: (uuid: string) => boolean;
  isDeleting: (uuid: string) => boolean;
  changePage: (page: number) => Promise<void>;
  changePageToRow: (row: BaseRow) => Promise<void>;
}

type ZustandState = Store & ZustandHiddenMethods & Omit<ExtendedState, 'toggleEditing'>;
type ExtendedContext = ContextMethods & Props;

const ZStore = createZustandContext({
  name: 'RepeatingGroupZ',
  required: true,
  initialCreateStore: newStore,
});

const ExtendedStore = createContext<ExtendedContext>({
  name: 'RepeatingGroup',
  required: true,
});

interface RowState {
  numVisibleRows: number;
  visibleRows: BaseRow[];
  hiddenRows: BaseRow[];
  editableRows: BaseRow[];
  deletableRows: BaseRow[];
}

function produceStateFromRows(rows: RepGroupRows): RowState {
  const hidden: BaseRow[] = [];
  const visible: BaseRow[] = [];
  const editable: BaseRow[] = [];
  const deletable: BaseRow[] = [];
  for (const row of rows) {
    if (!row) {
      continue;
    }
    const rowObj: BaseRow = {
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

type PaginationState =
  | {
      hasPagination: true;
      currentPage: number;
      totalPages: number;
      rowsPerPage: number;
      rowsToDisplay: BaseRow[];
    }
  | {
      hasPagination: false;
      currentPage: undefined;
      totalPages: undefined;
      rowsPerPage: undefined;
      rowsToDisplay: BaseRow[];
    };

/**
 * Produces the current pagination state if relevant
 */
function producePaginationState(
  currentPage: number | undefined,
  pagination: CompInternal<'RepeatingGroup'>['pagination'],
  visibleRows: BaseRow[],
): PaginationState {
  if (typeof currentPage !== 'number' || !pagination) {
    return {
      hasPagination: false,
      currentPage: undefined,
      totalPages: undefined,
      rowsPerPage: undefined,
      rowsToDisplay: visibleRows,
    };
  }

  const rowsPerPage = pagination.rowsPerPage;
  const totalPages = Math.ceil(visibleRows.length / rowsPerPage);

  const start = currentPage * rowsPerPage;
  const end = (currentPage + 1) * rowsPerPage;

  const rowsToDisplay = visibleRows.slice(start, end);

  return {
    hasPagination: true,
    currentPage,
    totalPages,
    rowsPerPage,
    rowsToDisplay,
  };
}

/**
 * Gets the pagination page for a given row
 * Will return undefined if pagination is not used or the row is not visible
 */
function getPageForRow(row: BaseRow, paginationState: PaginationState, visibleRows: BaseRow[]): number | undefined {
  if (!paginationState.hasPagination) {
    return undefined;
  }
  const index = visibleRows.findIndex((r) => r.uuid == row.uuid);
  if (index < 0) {
    return undefined;
  }
  const newPage = Math.floor(index / paginationState.rowsPerPage);

  return newPage != paginationState.currentPage ? newPage : undefined;
}

/**
 * Used for navigating to the correct pagination page when opening a row for editing
 * If the repeating group does not use pagination this will have no effect
 */
function gotoPageForRow(
  row: BaseRow,
  paginationState: PaginationState,
  visibleRows: BaseRow[],
): { currentPage: number } | undefined {
  const newPage = getPageForRow(row, paginationState, visibleRows);
  return newPage != null ? { currentPage: newPage } : undefined;
}

interface NewStoreProps {
  freshRowsRef: MutableRefObject<BaseRow[] | undefined>;
  rowsRef: MutableRefObject<RepGroupRows>;
  editMode: IGroupEditProperties['mode'];
  pagination: CompInternal<'RepeatingGroup'>['pagination'];
}

function newStore({ editMode, pagination, rowsRef, freshRowsRef }: NewStoreProps) {
  return createStore<ZustandState>((set) => ({
    freshRowsRef,
    editingAll: editMode === 'showAll',
    editingNone: editMode === 'onlyTable',
    isFirstRender: true,
    editingId: undefined,
    deletingIds: [],
    addingIds: [],
    currentPage: pagination ? 0 : undefined,

    closeForEditing: (row) => {
      set((state) => {
        if (state.editingId === row.uuid) {
          return { editingId: undefined };
        }
        return state;
      });
    },

    openForEditing: (row) => {
      set((state) => {
        if (state.editingId === row.uuid || state.editingAll || state.editingNone) {
          return state;
        }
        const { editableRows, visibleRows } = produceStateFromRows(rowsRef.current);
        if (!editableRows.some((row) => row.uuid === row.uuid)) {
          return state;
        }
        const paginationState = producePaginationState(state.currentPage, pagination, visibleRows);
        return { editingId: row.uuid, ...gotoPageForRow(row, paginationState, visibleRows) };
      });
    },

    openNextForEditing: () => {
      set((state) => {
        if (state.editingAll || state.editingNone) {
          return state;
        }
        const { editableRows, visibleRows } = produceStateFromRows(rowsRef.current);
        const paginationState = producePaginationState(state.currentPage, pagination, visibleRows);
        if (state.editingId === undefined) {
          const firstRow = editableRows[0];
          return { editingId: firstRow.uuid, ...gotoPageForRow(firstRow, paginationState, visibleRows) };
        }
        const isLast = state.editingId === editableRows[editableRows.length - 1].uuid;
        if (isLast) {
          return { editingId: undefined };
        }
        const currentIndex = editableRows.findIndex((row) => row.uuid === state.editingId);
        const nextRow = editableRows[currentIndex + 1];
        return { editingId: nextRow.uuid, ...gotoPageForRow(nextRow, paginationState, visibleRows) };
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

    startDeletingRow: (row) => {
      set((state) => {
        if (state.deletingIds.includes(row.uuid)) {
          return state;
        }
        return { deletingIds: [...state.deletingIds, row.uuid] };
      });
    },

    endDeletingRow: (row, successful) => {
      set((state) => {
        const isEditing = state.editingId === row.uuid;
        const i = state.deletingIds.indexOf(row.uuid);
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

    changePage: (page) => set(() => ({ currentPage: page, editingId: undefined })),
  }));
}

function useExtendedRepeatingGroupState(node: LayoutNode<'RepeatingGroup'>): ExtendedContext {
  const stateRef = ZStore.useSelectorAsRef((state) => state);
  const validateOnSaveRow = useNodeItem(node, (i) => i.validateOnSaveRow);
  const groupBinding = useNodeItem(node, (i) => i.dataModelBindings.group);

  const appendToList = FD.useAppendToList();
  const removeFromList = FD.useRemoveFromListCallback();
  const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(node);
  const onGroupCloseValidation = useOnGroupCloseValidation();

  const waitForItem = useWaitForNodeItem(node);

  const rowStateRef = useNodeItemRef(node, (i) => produceStateFromRows(i.rows));
  const paginationStateRef = useNodeItemRef(node, (i) => {
    const rowState = produceStateFromRows(i.rows);
    return producePaginationState(stateRef.current.currentPage, i.pagination, rowState.visibleRows);
  });

  const maybeValidateRow = useCallback(() => {
    const { editingAll, editingId, editingNone } = stateRef.current;
    const index = rowStateRef.current.editableRows.find((row) => row.uuid === editingId)?.index;
    if (!validateOnSaveRow || editingAll || editingNone || editingId === undefined || index === undefined) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(node, index, validateOnSaveRow);
  }, [node, onGroupCloseValidation, rowStateRef, stateRef, validateOnSaveRow]);

  const openForEditing = useCallback(
    async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.openForEditing(row);
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
    async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.closeForEditing(row);
    },
    [maybeValidateRow, stateRef],
  );

  const toggleEditing = useCallback(
    async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      const { editingId, closeForEditing, openForEditing } = stateRef.current;
      if (editingId === row.uuid) {
        closeForEditing(row);
      } else {
        openForEditing(row);
      }
    },
    [maybeValidateRow, stateRef],
  );

  const changePage = useCallback(
    async (page: number) => {
      if (await maybeValidateRow()) {
        return;
      }
      stateRef.current.changePage(page);
    },
    [maybeValidateRow, stateRef],
  );

  const changePageToRow = useCallback(
    async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }

      const page = getPageForRow(row, paginationStateRef.current, rowStateRef.current.visibleRows);
      if (page == null) {
        return;
      }

      stateRef.current.changePage(page);
    },
    [maybeValidateRow, rowStateRef, paginationStateRef, stateRef],
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
    const { startAddingRow, endAddingRow } = stateRef.current;
    if (!groupBinding) {
      return { result: 'stoppedByBinding', uuid: undefined, index: undefined };
    }
    if (await maybeValidateRow()) {
      return { result: 'stoppedByValidation', uuid: undefined, index: undefined };
    }
    const uuid = uuidv4();
    appendToList({
      reference: groupBinding,
      newValue: { [ALTINN_ROW_ID]: uuid },
    });
    startAddingRow(uuid);
    let foundRow: RepGroupRow | undefined;
    await waitForItem((item) => {
      foundRow = item?.rows.find((row) => row?.uuid === uuid && row.groupExpressions);
      return !!foundRow;
    });
    endAddingRow(uuid);

    // It may take some time until effects run and the row is put into either the visibleRows or hiddenRows state in
    // the ref, so we'll loop this a few times until we find the row.
    let attempts = 5;
    let foundVisible: boolean | undefined;
    while (foundVisible === undefined && attempts > 0) {
      foundVisible = rowStateRef.current.visibleRows.find((row) => row.uuid === uuid)
        ? true
        : rowStateRef.current.hiddenRows.find((row) => row.uuid === uuid)
          ? false
          : undefined;
      if (foundVisible === undefined && attempts > 0) {
        attempts--;
        await new Promise((resolve) => setTimeout(resolve, 4));
      }
    }

    const index = foundRow?.index ?? -1;
    if (foundVisible) {
      await openForEditing({ uuid, index });
      return { result: 'addedAndOpened', uuid, index };
    }

    return { result: 'addedAndHidden', uuid, index };
  }, [appendToList, groupBinding, maybeValidateRow, rowStateRef, openForEditing, stateRef, waitForItem]);

  const deleteRow = useCallback(
    async (row: BaseRow) => {
      const { deletableRows } = rowStateRef.current;
      const { startDeletingRow, endDeletingRow } = stateRef.current;
      const deletableRow = deletableRows.find((r) => r.uuid === row.uuid && r.index === row.index);
      if (!deletableRow) {
        return false;
      }

      startDeletingRow(row);
      const attachmentDeletionSuccessful = await onBeforeRowDeletion(row.index);
      if (attachmentDeletionSuccessful && groupBinding) {
        removeFromList({
          reference: groupBinding,
          startAtIndex: row.index,
          callback: (item) => item[ALTINN_ROW_ID] === row.uuid,
        });

        endDeletingRow(row, true);
        return true;
      }

      endDeletingRow(row, false);
      return false;
    },
    [groupBinding, rowStateRef, onBeforeRowDeletion, removeFromList, stateRef],
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
    changePage,
    changePageToRow,
  };
}

function EffectCloseEditing() {
  const editingId = ZStore.useSelector((state) => state.editingId);
  const closeForEditing = ZStore.useSelector((state) => state.closeForEditing);
  const nodeState = useRepeatingGroupRowState();
  const editingAsHidden =
    editingId !== undefined ? nodeState.hiddenRows.find((row) => row.uuid === editingId) : undefined;
  useEffect(() => {
    if (editingAsHidden) {
      closeForEditing(editingAsHidden);
    }
  }, [closeForEditing, editingAsHidden]);

  return null;
}

function EffectPagination() {
  // If rows are deleted so that the current pagination page no longer exists, go to the last page instead
  const changePage = ZStore.useSelector((state) => state.changePage);
  const paginationState = useRepeatingGroupPagination();
  const { currentPage, totalPages, hasPagination } = paginationState;
  useEffect(() => {
    if (hasPagination && currentPage > totalPages - 1) {
      changePage(totalPages - 1);
    }
  }, [currentPage, totalPages, hasPagination, changePage]);

  return null;
}

/**
 * The item.rows state is updated through effects in the hierarchy generated, and will always be a bit slower
 * than the source (fresh list of rows from the data model). This trick stores a ref always containing a
 * fresh list of rows we can use to filter out rows that are about to be deleted. This fixes a problem
 * where repeating group rows will 'flash' with outdated data before being removed.
 */
function EffectSelectFreshRows({ freshRowsRef }: { freshRowsRef: MutableRefObject<BaseRow[] | undefined> }) {
  const node = useRepeatingGroupNode();
  const binding = useNodeItem(node, (i) => i.dataModelBindings.group);
  freshRowsRef.current = FD.useFreshRows(binding);

  return null;
}

/**
 * This function filters out rows that are about to be deleted from the rows state
 */
function filterByFreshRows(rows: RepGroupRows, freshRows: BaseRow[] | undefined): RepGroupRows {
  if (!freshRows) {
    return rows;
  }
  const freshRowIds = new Set(freshRows.map((row) => `${row.uuid}-${row.index}`));
  return rows.filter((row) => !!row && freshRowIds.has(`${row.uuid}-${row.index}`));
}

function ProvideTheRest({ node, children }: PropsWithChildren<Props>) {
  const extended = useExtendedRepeatingGroupState(node);
  return <ExtendedStore.Provider value={extended}>{children}</ExtendedStore.Provider>;
}

interface Props {
  node: LayoutNode<'RepeatingGroup'>;
}

export function RepeatingGroupProvider({ node, children }: PropsWithChildren<Props>) {
  const pagination = useNodeItem(node, (i) => i.pagination);
  const editMode = useNodeItem(node, (i) => i.edit?.mode);

  const freshRowsRef = useRef<BaseRow[] | undefined>(undefined);
  const rowsRef = useNodeItemRef(node, (i) => filterByFreshRows(i.rows, freshRowsRef.current));

  return (
    <ZStore.Provider
      freshRowsRef={freshRowsRef}
      rowsRef={rowsRef}
      pagination={pagination}
      editMode={editMode}
    >
      <ProvideTheRest node={node}>
        <EffectCloseEditing />
        <EffectPagination />
        <EffectSelectFreshRows freshRowsRef={freshRowsRef} />
        <OpenByDefaultProvider node={node}>{children}</OpenByDefaultProvider>
      </ProvideTheRest>
    </ZStore.Provider>
  );
}

export const useRepeatingGroup = () => ExtendedStore.useCtx();
export const useRepeatingGroupNode = () => ExtendedStore.useCtx().node;

export const useRepeatingGroupRowState = () => {
  const node = useRepeatingGroupNode();
  const freshRowsRef = ZStore.useSelector((state) => state.freshRowsRef);
  return useNodeItem(node, (i) => produceStateFromRows(filterByFreshRows(i.rows, freshRowsRef.current)));
};

export const useRepeatingGroupPagination = () => {
  const node = useRepeatingGroupNode();
  const nodeState = useRepeatingGroupRowState();
  const pagination = useNodeItem(node, (i) => i.pagination);
  const currentPage = ZStore.useSelector((state) => state.currentPage);
  return producePaginationState(currentPage, pagination, nodeState.visibleRows);
};

export function useRepeatingGroupSelector<T>(selector: (state: Store) => T): T {
  return ZStore.useMemoSelector(selector);
}
