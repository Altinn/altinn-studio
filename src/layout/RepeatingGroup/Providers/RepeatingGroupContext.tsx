import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { OpenByDefaultProvider } from 'src/layout/RepeatingGroup/Providers/OpenByDefaultProvider';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import type { CompInternal } from 'src/layout/layout';
import type { IGroupEditProperties } from 'src/layout/RepeatingGroup/config.generated';
import type { RepGroupRow, RepGroupRowWithButtons } from 'src/layout/RepeatingGroup/utils';
import type { BaseRow } from 'src/utils/layout/types';

interface Store {
  baseComponentId: string;
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

type AddRowResult =
  | { result: 'stoppedByBinding'; uuid: undefined; index: undefined }
  | { result: 'stoppedByValidation'; uuid: undefined; index: undefined }
  | ({ result: 'addedAndOpened' | 'addedAndHidden' } & BaseRow);

interface ExtendedState {
  // Methods for getting/setting state about which rows are in edit mode
  toggleEditing: (row: BaseRow) => void;
  openForEditing: (row: BaseRow) => void;
  openNextForEditing: () => void;
  closeForEditing: (row: BaseRow) => void;
  changePage: (page: number) => void;
}

type ZustandState = Store & ZustandHiddenMethods & Omit<ExtendedState, 'toggleEditing'>;

const ZStore = createZustandContext({
  name: 'RepeatingGroupZ',
  required: true,
  initialCreateStore: newStore,
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
  baseComponentId: string;
  getRows: () => RepGroupRowWithButtons[];
  editMode: IGroupEditProperties['mode'];
  pagination: CompInternal<'RepeatingGroup'>['pagination'];
}

function newStore({ baseComponentId, getRows, editMode, pagination }: NewStoreProps) {
  function produce() {
    return produceStateFromRows(getRows());
  }

  return createStore<ZustandState>((set) => ({
    baseComponentId,
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
      baseComponentId={baseComponentId}
      getRows={getRows}
      pagination={pagination}
      editMode={editMode}
    >
      <EffectCloseEditing />
      <EffectPagination />
      <OpenByDefaultProvider baseComponentId={baseComponentId}>{children}</OpenByDefaultProvider>
    </ZStore.Provider>
  );
}

export const useRepeatingGroupComponentId = () => ZStore.useSelector((state) => state.baseComponentId);

function useMaybeValidateRow() {
  const store = ZStore.useStore();
  const baseComponentId = useRepeatingGroupComponentId();
  const { validateOnSaveRow } = useExternalItem(baseComponentId, 'RepeatingGroup');
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const getRows = RepGroupHooks.useGetFreshRowsWithButtons(baseComponentId);

  return () => {
    const { editingAll, editingId, editingNone } = store.getState();
    const index = produceStateFromRows(getRows() ?? []).editableRows.find((row) => row.uuid === editingId)?.index;
    if (!validateOnSaveRow || editingAll || editingNone || editingId === undefined || index === undefined) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(baseComponentId, index, validateOnSaveRow);
  };
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

export const RepGroupContext = {
  useIsEditingRow(uuid: string | undefined) {
    return ZStore.useSelector((state) => {
      if (state.editingAll) {
        return true;
      }
      if (state.editingNone) {
        return false;
      }
      if (uuid === undefined) {
        return false;
      }
      return state.editingId === uuid;
    });
  },
  useIsDeletingRow(uuid: string | undefined) {
    return ZStore.useSelector((state) => (uuid ? state.deletingIds.includes(uuid) : false));
  },
  useToggleEditing() {
    const store = ZStore.useStore();
    const rawOpenForEditing = ZStore.useStaticSelector((state) => state.openForEditing);
    const rawCloseForEditing = ZStore.useStaticSelector((state) => state.closeForEditing);
    const maybeValidateRow = useMaybeValidateRow();

    return async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      const editingId = store.getState().editingId;
      if (editingId === row.uuid) {
        rawCloseForEditing(row);
      } else {
        rawOpenForEditing(row);
      }
    };
  },
  useOpenForEditing() {
    const rawOpenForEditing = ZStore.useStaticSelector((state) => state.openForEditing);
    const maybeValidateRow = useMaybeValidateRow();

    return async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      rawOpenForEditing(row);
    };
  },
  useOpenNextForEditing() {
    const rawOpenNextForEditing = ZStore.useStaticSelector((state) => state.openNextForEditing);
    const maybeValidateRow = useMaybeValidateRow();

    return async () => {
      if (await maybeValidateRow()) {
        return;
      }
      rawOpenNextForEditing();
    };
  },
  useCloseForEditing() {
    const rawCloseForEditing = ZStore.useStaticSelector((state) => state.closeForEditing);
    const maybeValidateRow = useMaybeValidateRow();

    return async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      rawCloseForEditing(row);
    };
  },
  useChangePage() {
    const rawChangePage = ZStore.useStaticSelector((state) => state.changePage);
    const maybeValidateRow = useMaybeValidateRow();

    return async (page: number) => {
      if (await maybeValidateRow()) {
        return;
      }
      rawChangePage(page);
    };
  },
  useChangePageToRow() {
    const store = ZStore.useStore();
    const baseComponentId = useRepeatingGroupComponentId();
    const rawChangePage = ZStore.useStaticSelector((state) => state.changePage);
    const maybeValidateRow = useMaybeValidateRow();

    const { pagination } = useExternalItem(baseComponentId, 'RepeatingGroup');
    const getRows = RepGroupHooks.useGetFreshRowsWithButtons(baseComponentId);
    const getState = () => produceStateFromRows(getRows() ?? []);
    const getPaginationState = () =>
      producePaginationState(store.getState().currentPage, pagination, getState().visibleRows);

    return async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      const page = getPageForRow(row, getPaginationState(), getState().visibleRows);
      if (page == null) {
        return;
      }
      rawChangePage(page);
    };
  },
  useAddRow() {
    const baseComponentId = useRepeatingGroupComponentId();
    const rawStartAddingRow = ZStore.useStaticSelector((state) => state.startAddingRow);
    const rawEndAddingRow = ZStore.useStaticSelector((state) => state.endAddingRow);
    const rawOpenForEditing = ZStore.useStaticSelector((state) => state.openForEditing);
    const maybeValidateRow = useMaybeValidateRow();

    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const autoSaving = usePageSettings().autoSaveBehavior !== 'onChangePage';
    const waitUntilSaved = FD.useWaitForSave();
    const appendToList = FD.useAppendToList();
    const getRows = RepGroupHooks.useGetFreshRowsWithButtons(baseComponentId);
    const getState = () => produceStateFromRows(getRows() ?? []);

    return async (): Promise<AddRowResult> => {
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

      rawStartAddingRow(uuid);
      if (autoSaving) {
        await waitUntilSaved();
      }

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

      rawEndAddingRow(uuid);

      const index = found?.index ?? -1;
      if (found && !found.hidden) {
        rawOpenForEditing({ uuid, index });
        return { result: 'addedAndOpened', uuid, index };
      }

      return { result: 'addedAndHidden', uuid, index };
    };
  },
  useDeleteRow() {
    const baseComponentId = useRepeatingGroupComponentId();
    const rawStartDeletingRow = ZStore.useStaticSelector((state) => state.startDeletingRow);
    const rawEndDeletingRow = ZStore.useStaticSelector((state) => state.endDeletingRow);

    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const removeFromList = FD.useRemoveFromListCallback();
    const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(baseComponentId);
    const getRows = RepGroupHooks.useGetFreshRowsWithButtons(baseComponentId);
    const getState = () => produceStateFromRows(getRows() ?? []);

    return async (row: BaseRow) => {
      const { deletableRows } = getState();
      const deletableRow = deletableRows.find((r) => r.uuid === row.uuid && r.index === row.index);
      if (!deletableRow) {
        return false;
      }

      rawStartDeletingRow(row);
      const attachmentDeletionSuccessful = await onBeforeRowDeletion(row.index);
      if (attachmentDeletionSuccessful && groupBinding) {
        removeFromList({
          reference: groupBinding,
          startAtIndex: row.index,
          callback: (item) => item[ALTINN_ROW_ID] === row.uuid,
        });

        rawEndDeletingRow(row, true);
        return true;
      }

      rawEndDeletingRow(row, false);
      return false;
    };
  },
};
