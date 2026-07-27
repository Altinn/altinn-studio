import { useEffect, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router';
import type React from 'react';

import { SearchParams } from 'src/core/routing/types';
import { replaceAndPreventResetOptions } from 'src/features/navigation/navigationOptions';
import { useQueryKey } from 'src/hooks/navigation';

export type FocusComponentRequest = {
  nodeId: string;
  errorBinding: string | null;
};

const focusComponentListeners = new Set<() => void>();
let currentFocusComponentRequest: FocusComponentRequest | undefined;
let cleanupFocusComponentUrl: (() => void) | undefined;

export function setFocusComponentRequest(request: FocusComponentRequest | undefined) {
  currentFocusComponentRequest = request;
  for (const listener of focusComponentListeners) {
    listener();
  }
}

export function setFocusComponentUrlCleanup(cleanup: (() => void) | undefined) {
  cleanupFocusComponentUrl = cleanup;
}

export function useFocusComponentRequest(nodeId: string): FocusComponentRequest | undefined {
  return useSyncExternalStore(
    (listener) => {
      focusComponentListeners.add(listener);
      return () => focusComponentListeners.delete(listener);
    },
    () => (currentFocusComponentRequest?.nodeId === nodeId ? currentFocusComponentRequest : undefined),
    () => undefined,
  );
}

export function useHandleFocusComponent(nodeId: string, containerDivRef: React.RefObject<HTMLDivElement | null>) {
  const focusRequest = useFocusComponentRequest(nodeId);
  const pathnameWas = window.location.pathname;

  useEffect(() => {
    const div = containerDivRef.current;
    if (focusRequest && div) {
      const animationFrame = requestAnimationFrame(() => {
        div.scrollIntoView({ behavior: 'instant' });
      });

      try {
        const field = findElementToFocus(div, focusRequest.errorBinding);
        if (field) {
          field.focus();
        }
      } finally {
        if (pathnameWas === window.location.pathname) {
          cleanupFocusComponentUrl?.();
        }
      }

      return () => cancelAnimationFrame(animationFrame);
    }
  }, [containerDivRef, focusRequest, pathnameWas]);
}

export function FocusComponentRequestFromUrl() {
  const focusComponentId = useQueryKey(SearchParams.FocusComponentId);
  const focusErrorBinding = useQueryKey(SearchParams.FocusErrorBinding);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    setFocusComponentRequest(
      focusComponentId
        ? {
            nodeId: focusComponentId,
            errorBinding: focusErrorBinding,
          }
        : undefined,
    );
  }, [focusComponentId, focusErrorBinding]);

  useEffect(() => {
    setFocusComponentUrlCleanup(() => {
      setSearchParams((params) => {
        if (!params.has(SearchParams.FocusComponentId) && !params.has(SearchParams.FocusErrorBinding)) {
          return params;
        }

        const nextParams = new URLSearchParams(params);
        nextParams.delete(SearchParams.FocusComponentId);
        nextParams.delete(SearchParams.FocusErrorBinding);
        return nextParams;
      }, replaceAndPreventResetOptions);
    });

    return () => setFocusComponentUrlCleanup(undefined);
  }, [setSearchParams]);

  return null;
}

export function findElementToFocus(div: HTMLDivElement | null, binding: string | null) {
  if (!div) {
    return undefined;
  }

  const targetElements = Array.from(
    div.querySelectorAll<HTMLElement>(
      ['input', 'textarea', 'select', 'button', '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'].join(
        ',',
      ),
    ),
  );

  if (targetElements.length === 0) {
    return undefined;
  }

  if (binding !== null) {
    const matchesBinding = (element: HTMLElement) => element.dataset.bindingkey === binding;
    const bindingInput = targetElements.find(
      (element) => matchesBinding(element) && element.matches('input,textarea,select'),
    );
    if (bindingInput) {
      return bindingInput;
    }

    const anyBinding = targetElements.find(matchesBinding);
    if (anyBinding) {
      return anyBinding;
    }
  }

  const firstInputLike = targetElements.find((element) => element.matches('input,textarea,select'));
  return firstInputLike ?? targetElements[0];
}
