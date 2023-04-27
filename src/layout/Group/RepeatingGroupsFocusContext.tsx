import React, { createContext, useContext, useMemo, useRef } from 'react';

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

const RepeatingGroupsFocusContext = createContext<Context | null>(null);

export function useRepeatingGroupsFocusContext(): Context {
  const context = useContext(RepeatingGroupsFocusContext);
  if (!context) {
    return {
      refSetter: () => undefined,
      triggerFocus: () => undefined,
    };
  }

  return context;
}

export function RepeatingGroupsFocusProvider(props: { children: React.ReactNode }) {
  const elementRefs = useMemo(() => new Map<string, HTMLElement | null>(), []);
  const waitingForFocus = useRef<number | null>(null);

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

  return (
    <RepeatingGroupsFocusContext.Provider value={{ refSetter, triggerFocus }}>
      {props.children}
    </RepeatingGroupsFocusContext.Provider>
  );
}

function isFocusable(element: FocusableHTMLElement) {
  const tagName = element.tagName.toLowerCase();
  const focusableElements = ['a', 'input', 'select', 'textarea', 'button'];

  if (element.tabIndex < 0) {
    return false;
  }

  const isAvailable =
    element.type !== 'hidden' || !element.disabled || (element.type.toLowerCase() === 'a' && !!element.href);

  return focusableElements.includes(tagName) && isAvailable;
}

function findFirstFocusableElement(container: HTMLElement): FocusableHTMLElement | undefined {
  return Array.from(container.getElementsByTagName('*')).find(isFocusable) as FocusableHTMLElement;
}
