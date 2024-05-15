import React, { useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { useRepeatingGroup } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import type { ParentNode } from 'src/layout/layout';

type FocusableHTMLElement = HTMLElement &
  HTMLButtonElement &
  HTMLInputElement &
  HTMLSelectElement &
  HTMLTextAreaElement &
  HTMLAnchorElement;

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
  useRegisterNodeNavigationHandler((targetNode) => {
    // We are a parent of the target component, and the targetChild is the target component (or a nested group
    // containing the target component).
    let targetChild: ParentNode = targetNode;
    for (const parent of targetNode.parents()) {
      if (parent.item.id !== node.item.id) {
        targetChild = parent;
        continue;
      }

      const row = node.item.rows.find((r) => r.items.some((i) => i.item.id === targetChild.item.id));

      // If pagination is used, navigate to the correct page
      if (node.item.pagination) {
        if (row) {
          changePageToRow(row.uuid);
        } else {
          return false;
        }
      }

      if (node.item.edit?.mode === 'showAll' || node.item.edit?.mode === 'onlyTable') {
        // We're already showing all nodes, so nothing further to do
        return true;
      }

      // Check if we need to open the row containing targetChild for editing.
      const targetChildBaseComponentId = targetChild.item.baseComponentId ?? targetChild.item.id;
      const tableColSetup =
        (node.item.tableColumns && targetChildBaseComponentId && node.item.tableColumns[targetChildBaseComponentId]) ||
        {};

      if (tableColSetup.editInTable || tableColSetup.showInExpandedEdit === false) {
        // No need to open rows or set editIndex for components that are rendered
        // in table (outside the edit container)
        return false;
      }

      if (row) {
        openForEditing(row.uuid);
        return true;
      }
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

function isFocusable(element: FocusableHTMLElement) {
  const tagName = element.tagName.toLowerCase();
  const focusableElements = ['a', 'input', 'select', 'textarea', 'button'];

  if (element.tabIndex < 0) {
    return false;
  }

  const isAvailable =
    (element.tagName === 'INPUT' && element.getAttribute('type') !== 'hidden') ||
    !element.disabled ||
    (element.tagName === 'A' && !!element.href);

  return focusableElements.includes(tagName) && isAvailable;
}

function findFirstFocusableElement(container: HTMLElement): FocusableHTMLElement | undefined {
  return Array.from(container.getElementsByTagName('*')).find(isFocusable) as FocusableHTMLElement;
}
