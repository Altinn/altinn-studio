import React, { useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { FD } from 'src/features/formData/FormDataWrite';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

type FocusableHTMLElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLAnchorElement;

export type RefSetter = (rowIndex: number, key: string, node: HTMLElement | null) => void;
export type FocusTrigger = (rowIndex: number) => void;

interface Context {
  refSetter: RefSetter;
  triggerFocus: FocusTrigger;
}

const { Provider, useCtx } = createContext<Context>({
  name: 'RepeatingGroupsFocus',
  required: false,
  default: {
    refSetter: () => undefined,
    triggerFocus: () => undefined,
  },
});

export const useRepeatingGroupsFocusContext = () => useCtx();

export function RepeatingGroupsFocusProvider({ children }: PropsWithChildren) {
  const elementRefs = useMemo(() => new Map<string, HTMLElement | null>(), []);
  const waitingForFocus = useRef<number | null>(null);

  const { node, openForEditing, changePageToRow } = useRepeatingGroup();
  const groupBinding = useNodeItem(node, (i) => i.dataModelBindings.group);
  const pagination = useNodeItem(node, (i) => i.pagination);
  const mode = useNodeItem(node, (i) => i.edit?.mode);
  const tableColumns = useNodeItem(node, (i) => i.tableColumns);
  const rowsSelector = FD.useDebouncedRowsSelector();

  useRegisterNodeNavigationHandler(async (targetNode) => {
    // Figure out if we are a parent of the target component, setting the targetChild to the target
    // component (or a nested repeating group containing the target component).
    let targetChild: LayoutNode | undefined;
    let subject: LayoutNode | LayoutPage | undefined = targetNode;

    while (subject) {
      if (!(subject instanceof LayoutNode)) {
        break;
      }
      if (subject.parent === node) {
        targetChild = subject;
        break;
      }
      subject = subject.parent;
    }

    if (!targetChild) {
      // We don't have any relation to the target
      return false;
    }

    const rows = rowsSelector(groupBinding);
    const row = rows.find((r) => r.index === targetChild?.rowIndex);

    // If pagination is used, navigate to the correct page
    if (pagination) {
      if (row) {
        await changePageToRow(row);
      } else {
        return false;
      }
    }

    if (mode === 'showAll' || mode === 'onlyTable') {
      // We're already showing all nodes, so nothing further to do
      return true;
    }

    // Check if we need to open the row containing targetChild for editing.
    const tableColSetup = (tableColumns && targetChild.baseId && tableColumns[targetChild.baseId]) || {};

    if (tableColSetup.editInTable || tableColSetup.showInExpandedEdit === false) {
      // No need to open rows or set editIndex for components that are rendered
      // in table (outside the edit container)
      return false;
    }

    if (row) {
      openForEditing(row);
      return true;
    }

    return false;
  });

  const triggerFocus: FocusTrigger = (rowIndex) => {
    waitingForFocus.current = null;
    if (elementRefs.size === 0) {
      waitingForFocus.current = rowIndex;
      return;
    }

    for (const [key, element] of elementRefs.entries()) {
      if (!key.startsWith(`${rowIndex}-`)) {
        continue;
      }
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
    } else {
      elementRefs.delete(`${rowIndex}-${key}`);
    }
  };

  return <Provider value={{ refSetter, triggerFocus }}>{children}</Provider>;
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
