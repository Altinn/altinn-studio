import React, { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { SearchParams } from 'src/core/routing/types';
import { FormStore } from 'src/features/form/FormContext';
import { isRepeatingComponentType } from 'src/features/form/layout/utils/repeating';
import {
  RepGroupContext,
  useRepeatingGroupComponentId,
  useRepeatingGroupRowState,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { useIntermediateItem } from 'src/utils/layout/hooks';
import { getBaseComponentId, splitDashedKey } from 'src/utils/splitDashedKey';
import type { ParentRef } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseRow } from 'src/utils/layout/types';

type FocusableHTMLElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLAnchorElement;

export type RefSetter = (rowIndex: number, key: string, div: HTMLElement | null) => void;
export type FocusTrigger = (rowIndex: number) => void;

// Key used when registering the whole table row as a focus target. This gives read-only tables after deleting a row
// something to focus.
const ROW_CONTAINER_KEY = 'row';
// Keys used to register the row's edit button and its edit container as focus targets.
const EDIT_BUTTON_KEY = 'editButton';
const EDIT_CONTAINER_KEY = 'editContainer';

interface Context {
  refSetter: RefSetter;
  triggerFocus: FocusTrigger;
  focusEditContainer: (rowIndex: number) => void;
  focusEditButton: (rowIndex: number) => void;
  registerAddButton: (node: HTMLElement | null) => void;
  focusAddButton: () => void;
}

const { Provider, useCtx } = createContext<Context>({
  name: 'RepeatingGroupsFocus',
  required: false,
  default: {
    refSetter: () => undefined,
    triggerFocus: () => undefined,
    focusEditContainer: () => undefined,
    focusEditButton: () => undefined,
    registerAddButton: () => undefined,
    focusAddButton: () => undefined,
  },
});

export const useRepeatingGroupsFocusContext = () => useCtx();

export function RepeatingGroupsFocusProvider({ children }: PropsWithChildren) {
  const elementRefs = useMemo(() => new Map<string, HTMLElement | null>(), []);
  const waitingForFocus = useRef<number | null>(null);
  const waitingForEditContainer = useRef<number | null>(null);
  const waitingForEditButton = useRef<number | null>(null);
  const addButtonRef = useRef<HTMLElement | null>(null);

  useNavigateToRepeatingGroupPageAndFocusRow();

  const triggerFocus: FocusTrigger = (rowIndex) => {
    waitingForFocus.current = null;
    if (elementRefs.size === 0) {
      waitingForFocus.current = rowIndex;
      return;
    }

    // Prefer specific row content (editable cells, edit container) and fall back to the row
    // container last, so we only focus an action button when there is nothing else to focus.
    const prefix = `${rowIndex}-`;
    const rowContainerKey = `${rowIndex}-${ROW_CONTAINER_KEY}`;
    const matching = Array.from(elementRefs.entries()).filter(([key]) => key.startsWith(prefix));
    const ordered = [
      ...matching.filter(([key]) => key !== rowContainerKey),
      ...matching.filter(([key]) => key === rowContainerKey),
    ];

    for (const [, element] of ordered) {
      const firstFocusableChild = element && findFirstFocusableElement(element);
      if (firstFocusableChild) {
        firstFocusableChild.focus();
        return;
      }
    }

    waitingForFocus.current = rowIndex;
  };

  const refSetter: RefSetter = (rowIndex, key, node) => {
    if (node) {
      elementRefs.set(`${rowIndex}-${key}`, node);

      if (waitingForFocus.current === rowIndex) {
        waitingForFocus.current = null;
        triggerFocus(rowIndex);
      }
      if (key === EDIT_CONTAINER_KEY && waitingForEditContainer.current === rowIndex) {
        waitingForEditContainer.current = null;
        focusEditContainer(rowIndex);
      }
      if (key === EDIT_BUTTON_KEY && waitingForEditButton.current === rowIndex) {
        waitingForEditButton.current = null;
        focusEditButton(rowIndex);
      }
    } else {
      elementRefs.delete(`${rowIndex}-${key}`);
    }
  };

  // Move focus to the first focusable element inside the edit container of a row. Used when
  // navigating between multiPage pages and when opening the next row for editing
  const focusEditContainer = (rowIndex: number) => {
    const element = elementRefs.get(`${rowIndex}-${EDIT_CONTAINER_KEY}`);
    const firstFocusableChild = element && findFirstFocusableElement(element);
    if (firstFocusableChild) {
      waitingForEditContainer.current = null;
      firstFocusableChild.focus();
      return;
    }
    waitingForEditContainer.current = rowIndex;
  };

  // Move focus to a row's edit button
  const focusEditButton = (rowIndex: number) => {
    const element = elementRefs.get(`${rowIndex}-${EDIT_BUTTON_KEY}`);
    if (element) {
      waitingForEditButton.current = null;
      element.focus();
      return;
    }
    waitingForEditButton.current = rowIndex;
  };

  const registerAddButton = (node: HTMLElement | null) => {
    addButtonRef.current = node;
  };

  const focusAddButton = () => {
    addButtonRef.current?.focus();
  };

  return (
    <Provider
      value={{ refSetter, triggerFocus, focusEditContainer, focusEditButton, registerAddButton, focusAddButton }}
    >
      {children}
    </Provider>
  );
}

export function getRowToFocusAfterDeletion(visibleRows: BaseRow[], deletedUuid: string): number | null {
  const sorted = [...visibleRows].sort((a, b) => a.index - b.index);
  const position = sorted.findIndex((row) => row.uuid === deletedUuid);
  if (position === -1) {
    return null;
  }

  const previousRow = sorted[position - 1];
  if (previousRow) {
    return previousRow.index;
  }

  const nextRow = sorted[position + 1];
  if (nextRow) {
    // The next row shifts down by one index once the (first) row is removed.
    return nextRow.index - 1;
  }

  return null;
}

export function useDeleteRowAndFocus() {
  const deleteRow = RepGroupContext.useDeleteRow();
  const { triggerFocus, focusAddButton } = useRepeatingGroupsFocusContext();
  const { visibleRows } = useRepeatingGroupRowState();

  return async (row: BaseRow): Promise<boolean> => {
    const focusTarget = getRowToFocusAfterDeletion(visibleRows, row.uuid);
    const successful = await deleteRow(row);
    if (successful) {
      // Wait for the row to be removed and the remaining rows to re-render before moving focus
      requestAnimationFrame(() => {
        if (focusTarget === null) {
          focusAddButton();
        } else {
          triggerFocus(focusTarget);
        }
      });
    }
    return successful;
  };
}

function isFocusable(element: HTMLElement): element is FocusableHTMLElement {
  const tagName = element.tagName.toLowerCase();
  const focusableElements = ['a', 'input', 'select', 'textarea', 'button'];

  if (element.tabIndex < 0) {
    return false;
  }

  const isAvailable =
    !(element as HTMLInputElement).disabled &&
    (element.tagName !== 'INPUT' || (element as HTMLInputElement).type !== 'hidden') &&
    (element.tagName !== 'A' || !!(element as HTMLAnchorElement).href);

  return focusableElements.includes(tagName) && isAvailable;
}

function findFirstFocusableElement(container: HTMLElement): FocusableHTMLElement | undefined {
  return Array.from(container.getElementsByTagName('*')).find(isFocusable);
}

function useNavigateToRepeatingGroupPageAndFocusRow() {
  const baseComponentId = useRepeatingGroupComponentId();
  const openForEditing = RepGroupContext.useOpenForEditing();
  const changePageToRow = RepGroupContext.useChangePageToRow();
  const { dataModelBindings, pagination, tableColumns, edit } = useIntermediateItem(baseComponentId, 'RepeatingGroup');
  const rowsSelector = FormStore.data.useDebouncedRowsSelector();
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const targetIndexedId = searchParams.get(SearchParams.FocusComponentId);
    if (!targetIndexedId) {
      return;
    }
    const targetBaseComponentId = getBaseComponentId(targetIndexedId);

    // Figure out if we are a parent of the target component, setting the targetChild to the target
    // component (or a nested repeating group containing the target component).
    let targetChild: string | undefined;
    let negativeRowIndex = -1;
    let subject: ParentRef = { type: 'node', id: targetBaseComponentId };
    while (subject.type === 'node') {
      const parent = layoutLookups.componentToParent[subject.id];
      if (parent?.id === baseComponentId) {
        targetChild = subject.id;
        break;
      }
      const parentComponent = layoutLookups.allComponents[parent.id];
      if (parentComponent && isRepeatingComponentType(parentComponent.type)) {
        // For every repeating component type we encounter in the hierarchy above this target, we should look backwards
        // in the indexed id for our actual row id.
        negativeRowIndex -= 1;
      }
      subject = parent;
    }
    if (!targetChild) {
      // We don't have any relation to the target
      return;
    }

    const rows = rowsSelector(dataModelBindings.group);
    const { depth } = splitDashedKey(targetIndexedId);
    const row = rows.find((r) => r.index === depth.at(negativeRowIndex));

    if (pagination && row) {
      changePageToRow(row);
      openForEditing(row);
      return;
    }
    if (edit?.mode === 'showAll' || edit?.mode === 'onlyTable') {
      // We're already showing all nodes, so nothing further to do
      return;
    }

    // Check if we need to open the row containing targetChild for editing.
    const tableColSetup = (tableColumns && tableColumns[targetChild]) || {};

    if (tableColSetup.editInTable || tableColSetup.showInExpandedEdit === false) {
      // No need to open rows or set editIndex for components that are rendered
      // in table (outside the edit container)
      return;
    }

    if (row) {
      openForEditing(row);
      return;
    }
  }, [
    baseComponentId,
    changePageToRow,
    dataModelBindings.group,
    edit?.mode,
    layoutLookups.allComponents,
    layoutLookups.componentToParent,
    openForEditing,
    pagination,
    rowsSelector,
    searchParams,
    tableColumns,
  ]);
}
