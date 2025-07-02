import React, { useCallback, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'zustand';

import { createContext } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { OpenByDefaultProvider } from 'src/layout/RepeatingGroup/Providers/OpenByDefaultProvider';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { CompInternal } from 'src/layout/layout';
import type { IGroupEditProperties } from 'src/layout/RepeatingGroup/config.generated';
import type { RepGroupRow, RepGroupRowWithButtons } from 'src/layout/RepeatingGroup/utils';
import type { BaseRow } from 'src/utils/layout/types';

interface Store {
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
  visibleRows: RepGroupRowWithButtons[];
  hiddenRows: RepGroupRowWithButtons[];
  editableRows: RepGroupRowWithButtons[];
  deletableRows: RepGroupRowWithButtons[];
}

function produceStateFromRows(rows: RepGroupRowWithButtons[]): RowState {
  const hidden: RepGroupRowWithButtons[] = [];
  const visible: RepGroupRowWithButtons[] = [];
  const editable: RepGroupRowWithButtons[] = [];
  const deletable: RepGroupRowWithButtons[] = [];
  for (const row of rows) {
    if (!row) {
      continue;
    }
    if (row.hidden) {
      hidden.push(row);
    } else {
      visible.push(row);

      // Only the visible rows can be edited or deleted
      if (row.editButton) {
        editable.push(row);
      }
      if (row.deleteButton) {
        deletable.push(row);
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
  getRows: () => RepGroupRowWithButtons[];
  editMode: IGroupEditProperties['mode'];
  pagination: CompInternal<'RepeatingGroup'>['pagination'];
}

function newStore({ getRows, editMode, pagination }: NewStoreProps) {
  function produce() {
    return produceStateFromRows(getRows());
  }

  return createStore<ZustandState>((set) => ({
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
        const { editableRows, visibleRows } = produce();
        if (!editableRows.some((r) => r.uuid === row.uuid)) {
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
        const { editableRows, visibleRows } = produce();
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

function useExtendedRepeatingGroupState(baseComponentId: string): ExtendedContext {
  const stateRef = ZStore.useSelectorAsRef((state) => state);
  const { pagination, validateOnSaveRow } = useExternalItem(baseComponentId, 'RepeatingGroup');
  const groupBinding = useBinding(baseComponentId);

  const autoSaving = usePageSettings().autoSaveBehavior !== 'onChangePage';
  const waitUntilSaved = FD.useWaitForSave();
  const waitUntilReady = NodesInternal.useWaitUntilReady();
  const appendToList = FD.useAppendToList();
  const removeFromList = FD.useRemoveFromListCallback();
  const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(baseComponentId);
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const markNodesNotReady = NodesInternal.useMarkNotReady();

  const getRows = RepGroupHooks.useGetFreshRowsWithButtons(baseComponentId);
  const getState = useCallback(() => produceStateFromRows(getRows() ?? []), [getRows]);
  const getPaginationState = useCallback(
    () => producePaginationState(stateRef.current.currentPage, pagination, getState().visibleRows),
    [stateRef, pagination, getState],
  );

  const maybeValidateRow = useCallback(() => {
    const { editingAll, editingId, editingNone } = stateRef.current;
    const index = getState().editableRows.find((row) => row.uuid === editingId)?.index;
    if (!validateOnSaveRow || editingAll || editingNone || editingId === undefined || index === undefined) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(baseComponentId, index, validateOnSaveRow);
  }, [baseComponentId, onGroupCloseValidation, getState, stateRef, validateOnSaveRow]);

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

      const page = getPageForRow(row, getPaginationState(), getState().visibleRows);
      if (page == null) {
        return;
      }

      stateRef.current.changePage(page);
    },
    [maybeValidateRow, getPaginationState, getState, stateRef],
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

    markNodesNotReady(); // Doing this early to prevent re-renders when this is added to the data model
    startAddingRow(uuid);
    if (autoSaving) {
      // When auto-saving is on, we can detect if backend datamodel changes will cause this row to be hidden right
      // after it was added (as the backend can add data to new rows), and thus we'll know to inform the app developer
      // if they've used openByDefault along with hidden-by-default rows. It's important not to wait for saving when
      // autosaving is off, as we'd wait forever.
      await waitUntilSaved();
    }

    // It may take some time until effects run and the row is put into either the visibleRows or hiddenRows state in
    // the ref, so we'll loop this a few times until we find the row.
    let attempts = 5;
    let found: RepGroupRow | undefined;
    while (found === undefined && attempts > 0) {
      const { visibleRows, hiddenRows } = getState();
      found = visibleRows.find((row) => row.uuid === uuid) || hiddenRows.find((row) => row.uuid === uuid);
      if (found === undefined && attempts > 0) {
        attempts--;
        await new Promise((resolve) => setTimeout(resolve, 4));
      }
    }

    await waitUntilReady();
    endAddingRow(uuid);

    const index = found?.index ?? -1;
    if (found && !found.hidden) {
      await openForEditing({ uuid, index });
      return { result: 'addedAndOpened', uuid, index };
    }

    return { result: 'addedAndHidden', uuid, index };
  }, [
    stateRef,
    groupBinding,
    maybeValidateRow,
    appendToList,
    markNodesNotReady,
    autoSaving,
    waitUntilReady,
    waitUntilSaved,
    getState,
    openForEditing,
  ]);

  const deleteRow = useCallback(
    async (row: BaseRow) => {
      const { deletableRows } = getState();
      const { startDeletingRow, endDeletingRow } = stateRef.current;
      const deletableRow = deletableRows.find((r) => r.uuid === row.uuid && r.index === row.index);
      if (!deletableRow) {
        return false;
      }

      markNodesNotReady(); // Doing this early to prevent re-renders when this is removed from the data model
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
    [getState, stateRef, markNodesNotReady, onBeforeRowDeletion, groupBinding, removeFromList],
  );

  const isDeleting = useCallback((uuid: string) => stateRef.current.deletingIds.includes(uuid), [stateRef]);

  return {
    baseComponentId,
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

function ProvideTheRest({ baseComponentId, children }: PropsWithChildren<Props>) {
  const extended = useExtendedRepeatingGroupState(baseComponentId);
  return <ExtendedStore.Provider value={extended}>{children}</ExtendedStore.Provider>;
}

interface Props {
  baseComponentId: string;
}

export function RepeatingGroupProvider({ baseComponentId, children }: PropsWithChildren<Props>) {
  const component = useExternalItem(baseComponentId, 'RepeatingGroup');
  const pagination = component.pagination;
  const editMode = component.edit?.mode;
  const getRows = RepGroupHooks.useGetFreshRowsWithButtons(baseComponentId);

  return (
    <ZStore.Provider
      getRows={getRows}
      pagination={pagination}
      editMode={editMode}
    >
      <ProvideTheRest baseComponentId={baseComponentId}>
        <EffectCloseEditing />
        <EffectPagination />
        <OpenByDefaultProvider baseComponentId={baseComponentId}>{children}</OpenByDefaultProvider>
      </ProvideTheRest>
    </ZStore.Provider>
  );
}

export const useRepeatingGroup = () => ExtendedStore.useCtx();
export const useRepeatingGroupComponentId = () => ExtendedStore.useCtx().baseComponentId;

function useBinding(baseComponentId: string) {
  return useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
}

export const useRepeatingGroupRowState = () => {
  const rows = RepGroupHooks.useAllRowsWithButtons(useRepeatingGroupComponentId());
  return useMemo(() => produceStateFromRows(rows), [rows]);
};

export const useRepeatingGroupPagination = () => {
  const nodeState = useRepeatingGroupRowState();
  const { pagination } = useExternalItem(useRepeatingGroupComponentId(), 'RepeatingGroup');
  const currentPage = ZStore.useSelector((state) => state.currentPage);
  return producePaginationState(currentPage, pagination, nodeState.visibleRows);
};

export function useRepeatingGroupSelector<T>(selector: (state: Store) => T): T {
  return ZStore.useMemoSelector(selector);
}
