import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';

type ElementFocusContextValue = {
  setRequestFocus: (value: boolean) => void;
  getRequestFocus: () => boolean;
};

const ElementFocusContext = createContext<ElementFocusContextValue | null>(null);

/**
 * Provider to coordinates moving focus to an element after a user action. The element receiving focus may be in
 * a component that unmounts/remounts (e.g. a view that swaps as state changes), so the request to focus lives in a context
 * above it and survives those transitions.
 *
 * Usage :
 * 1. Wrap the part of the component tree where you want to manage focus with `ElementFocusProvider`.
 * 2. Use `useFocusOnRequest` to get a ref callback to attach to the element that should receive focus after the user action.
 * 3. Call the function returned by `useRequestFocus` after the user action that should trigger the focus change
 */
export function ElementFocusProvider({ children }: PropsWithChildren) {
  const focusRequestedRef = useRef(false);
  const value = useMemo<ElementFocusContextValue>(
    () => ({
      setRequestFocus: (value: boolean) => {
        focusRequestedRef.current = value;
      },
      getRequestFocus: () => focusRequestedRef.current,
    }),
    [],
  );
  return <ElementFocusContext.Provider value={value}>{children}</ElementFocusContext.Provider>;
}

/**
 * Returns a ref callback to attach to an element. Once focus has been requested (via
 * {@link useRequestFocus}), the element that mounts with this ref receives focus so screen readers
 * announce it.
 */
export function useFocusOnRequest() {
  const context = useContext(ElementFocusContext);

  return useCallback(
    (node: HTMLElement | null) => {
      if (!node || !context || !context.getRequestFocus()) {
        return;
      }

      // A non-focusable element needs a tabindex to receive focus.
      if (!node.hasAttribute('tabindex')) {
        node.setAttribute('tabindex', '-1');
        node.addEventListener('blur', () => node.removeAttribute('tabindex'), { once: true });
      }
      node.focus();
    },
    [context],
  );
}

/**
 * Returns a function to call after a user action that changes which element should be focused (e.g.
 * after a mutation succeeds), so the element registered with {@link useFocusOnRequest} receives
 * focus and is announced by screen readers.
 */
export function useRequestFocus() {
  const context = useContext(ElementFocusContext);
  return useCallback(() => context?.setRequestFocus(true), [context]);
}
