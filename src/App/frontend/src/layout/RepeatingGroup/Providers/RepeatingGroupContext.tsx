import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'zustand';
import type { IGroupEditProperties } from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useAttachmentDeletionInRepGroups } from 'src/features/attachments/useAttachmentDeletionInRepGroups';
import { FormStore } from 'src/features/form/FormContext';
import { usePageSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useOnGroupCloseValidation } from 'src/features/validation/callbacks/onGroupCloseValidation';
import { useAsRef } from 'src/hooks/useAsRef';
import { OpenByDefaultProvider } from 'src/layout/RepeatingGroup/Providers/OpenByDefaultProvider';
import { getRepeatingRowReference, RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpressionCallback } from 'src/utils/layout/useEvalExpression';
import type { ExprResolved } from 'src/features/expressions/types';
import type { CompExternal } from 'src/layout/layout';
import type { BaseRow } from 'src/utils/layout/types';

interface Store {
  baseComponentId: string;
  editingAll: boolean;
  editingNone: boolean;
  editingId: string | undefined;
  deletingIds: string[];
  addingIds: string[];
  currentPage: number | undefined;
  deletedRowsCount: number;
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
  openNextForEditing: () => BaseRow | undefined;
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
  visibleRows: BaseRow[];
  hiddenRows: BaseRow[];
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
  pagination: ExprResolved<CompExternal<'RepeatingGroup'>>['pagination'],
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
  getVisibleRows: () => BaseRow[];
  isEditable: (row: BaseRow) => boolean;
  editMode: IGroupEditProperties['mode'];
  pagination: ExprResolved<CompExternal<'RepeatingGroup'>>['pagination'];
}

function newStore({ baseComponentId, getVisibleRows, isEditable, editMode, pagination }: NewStoreProps) {
  return createStore<ZustandState>((set) => ({
    baseComponentId,
    editingAll: editMode === 'showAll',
    editingNone: editMode === 'onlyTable',
    isFirstRender: true,
    editingId: undefined,
    deletingIds: [],
    addingIds: [],
    currentPage: pagination ? 0 : undefined,
    deletedRowsCount: 0,

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
        const visibleRows = getVisibleRows();
        const target = visibleRows.find((candidate) => candidate.uuid === row.uuid);
        if (!target || !isEditable(target)) {
          return state;
        }
        const paginationState = producePaginationState(state.currentPage, pagination, visibleRows);
        return { editingId: target.uuid, ...gotoPageForRow(target, paginationState, visibleRows) };
      });
    },

    openNextForEditing: () => {
      let openedRow: BaseRow | undefined;
      set((state) => {
        if (state.editingAll || state.editingNone) {
          return state;
        }
        const visibleRows = getVisibleRows();
        const currentIndex = visibleRows.findIndex((row) => row.uuid === state.editingId);
        const currentRow = visibleRows[currentIndex];
        const startIndex = currentRow && isEditable(currentRow) ? currentIndex + 1 : 0;
        const nextRow = visibleRows.slice(startIndex).find(isEditable);
        if (!nextRow) {
          return { editingId: undefined };
        }
        const paginationState = producePaginationState(state.currentPage, pagination, visibleRows);
        openedRow = nextRow;
        return { editingId: nextRow.uuid, ...gotoPageForRow(nextRow, paginationState, visibleRows) };
      });
      return openedRow;
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
        const deletedRowsCount = successful ? state.deletedRowsCount + 1 : state.deletedRowsCount;
        if (isEditing && successful) {
          return { editingId: undefined, deletingIds, deletedRowsCount };
        }
        return {
          deletingIds,
          deletedRowsCount,
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
  const component = useComponentConfig(baseComponentId, 'RepeatingGroup');
  const pagination = component.pagination;
  const editMode = component.edit?.mode;
  const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
  const getFreshRows = FormStore.data.useGetFreshRows();
  const isHidden = useEvalExpressionCallback(component.hiddenRow, Expressions.RepeatingGroup.hiddenRow);
  const canEdit = useEvalExpressionCallback(component.edit?.editButton, Expressions.RepeatingGroup.edit.editButton);
  const rowReaders = useAsRef({ groupBinding, getFreshRows, isHidden, canEdit });
  const getVisibleRows = () => {
    const readers = rowReaders.current;
    return readers
      .getFreshRows(readers.groupBinding)
      .filter((row) => !readers.isHidden(getRepeatingRowReference(readers.groupBinding, row.index)));
  };
  const isEditable = (row: BaseRow) => {
    const readers = rowReaders.current;
    return readers.canEdit(getRepeatingRowReference(readers.groupBinding, row.index));
  };

  return (
    <ZStore.Provider
      baseComponentId={baseComponentId}
      getVisibleRows={getVisibleRows}
      isEditable={isEditable}
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
  const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
  const onGroupCloseValidation = useOnGroupCloseValidation();
  const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
  const getFreshRows = FormStore.data.useGetFreshRows();
  const isHidden = useEvalExpressionCallback(config.hiddenRow, Expressions.RepeatingGroup.hiddenRow);
  const canEdit = useEvalExpressionCallback(config.edit?.editButton, Expressions.RepeatingGroup.edit.editButton);

  return () => {
    const { editingAll, editingId, editingNone } = store.getState();
    const row = getFreshRows(groupBinding).find((row) => row.uuid === editingId);
    if (!config.validateOnSaveRow || editingAll || editingNone || editingId === undefined || !row) {
      return Promise.resolve(false);
    }
    const location = getRepeatingRowReference(groupBinding, row.index);
    if (isHidden(location) || !canEdit(location)) {
      return Promise.resolve(false);
    }
    return onGroupCloseValidation(baseComponentId, row, config.validateOnSaveRow);
  };
}

export const useRepeatingGroupRowState = (): RowState => {
  const baseComponentId = useRepeatingGroupComponentId();
  const rows = RepGroupHooks.useAllBaseRows(baseComponentId);
  const visibleRows = RepGroupHooks.useVisibleRows(baseComponentId);
  return useMemo(() => {
    const visibleIds = new Set(visibleRows.map((row) => row.uuid));
    return {
      numVisibleRows: visibleRows.length,
      visibleRows,
      hiddenRows: rows.filter((row) => !visibleIds.has(row.uuid)),
    };
  }, [rows, visibleRows]);
};

export const useRepeatingGroupPagination = () => {
  const nodeState = useRepeatingGroupRowState();
  const config = useComponentConfig(useRepeatingGroupComponentId(), 'RepeatingGroup');
  const currentPage = ZStore.useSelector((state) => state.currentPage);
  return producePaginationState(currentPage, config.pagination, nodeState.visibleRows);
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

    // Returns the opened row, undefined at the end, or false when validation blocked navigation.
    return async (): Promise<BaseRow | undefined | false> => {
      if (await maybeValidateRow()) {
        return false;
      }
      return rawOpenNextForEditing();
    };
  },
  useCloseForEditing() {
    const rawCloseForEditing = ZStore.useStaticSelector((state) => state.closeForEditing);
    const maybeValidateRow = useMaybeValidateRow();
    const setRowValidationMask = FormStore.validation.useSetRowValidationMask();

    // Returns true when the row was closed, false when validation blocked it (row stays open).
    return async (row: BaseRow): Promise<boolean> => {
      if (await maybeValidateRow()) {
        return false;
      }
      setRowValidationMask(row.uuid, undefined);
      rawCloseForEditing(row);
      return true;
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

    const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const groupBinding = useDataModelBindingsFor(baseComponentId, 'RepeatingGroup')?.group;
    const getFreshRows = FormStore.data.useGetFreshRows();
    const isHidden = useEvalExpressionCallback(config.hiddenRow, Expressions.RepeatingGroup.hiddenRow);

    return async (row: BaseRow) => {
      if (await maybeValidateRow()) {
        return;
      }
      const visibleRows = getFreshRows(groupBinding).filter(
        (candidate) => !isHidden(getRepeatingRowReference(groupBinding, candidate.index)),
      );
      const pagination = producePaginationState(store.getState().currentPage, config.pagination, visibleRows);
      const page = getPageForRow(row, pagination, visibleRows);
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
    const waitUntilSaved = FormStore.data.useWaitForSave();
    const appendToList = FormStore.data.useAppendToList();
    const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const getFreshRows = FormStore.data.useGetFreshRows();
    const isHidden = useEvalExpressionCallback(config.hiddenRow, Expressions.RepeatingGroup.hiddenRow);

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
      let found: BaseRow | undefined;
      while (found === undefined && attempts > 0) {
        found = getFreshRows(groupBinding).find((row) => row.uuid === uuid);
        if (found === undefined && attempts > 0) {
          attempts--;
          await new Promise((resolve) => setTimeout(resolve, 4));
        }
      }

      rawEndAddingRow(uuid);

      const index = found?.index ?? -1;
      if (found && !isHidden(getRepeatingRowReference(groupBinding, found.index))) {
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
    const removeFromList = FormStore.data.useRemoveFromListCallback();
    const setRowValidationMask = FormStore.validation.useSetRowValidationMask();
    const onBeforeRowDeletion = useAttachmentDeletionInRepGroups(baseComponentId);
    const config = useComponentConfig(baseComponentId, 'RepeatingGroup');
    const getFreshRows = FormStore.data.useGetFreshRows();
    const isHidden = useEvalExpressionCallback(config.hiddenRow, Expressions.RepeatingGroup.hiddenRow);
    const canDelete = useEvalExpressionCallback(
      config.edit?.deleteButton,
      Expressions.RepeatingGroup.edit.deleteButton,
    );

    return async (row: BaseRow) => {
      const target = getFreshRows(groupBinding).find(
        (candidate) => candidate.uuid === row.uuid && candidate.index === row.index,
      );
      const location = getRepeatingRowReference(groupBinding, row.index);
      if (!target || isHidden(location) || !canDelete(location)) {
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

        setRowValidationMask(row.uuid, undefined);
        rawEndDeletingRow(row, true);
        return true;
      }

      rawEndDeletingRow(row, false);
      return false;
    };
  },
};
