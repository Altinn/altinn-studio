import { useCallback, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type React from 'react';

import { SearchParams } from 'src/core/routing/types';
import { replaceAndPreventResetOptions } from 'src/features/navigation/navigationOptions';

export type FocusComponentRequest = {
  nodeId: string;
  errorBinding: string | null;
};

type FocusHandler = (binding: string | null) => boolean;
type PendingFocusRequest = FocusComponentRequest & { onFinished?: () => void };

const focusComponentHandlers = new Map<string, Set<FocusHandler>>();
let pendingFocusRequest: PendingFocusRequest | undefined;

function focusRegisteredComponent(request: FocusComponentRequest) {
  for (const handler of focusComponentHandlers.get(request.nodeId) ?? []) {
    if (handler(request.errorBinding)) {
      return true;
    }
  }
  return false;
}

function tryPendingFocusRequest(nodeId: string) {
  const request = pendingFocusRequest;
  if (request?.nodeId === nodeId && focusRegisteredComponent(request) && pendingFocusRequest === request) {
    // Consume before URL cleanup can remount the target.
    pendingFocusRequest = undefined;
    request.onFinished?.();
  }
}

export function setFocusComponentRequest(request: FocusComponentRequest | undefined, onFinished?: () => void) {
  pendingFocusRequest = request ? { ...request, onFinished } : undefined;
  if (request) {
    tryPendingFocusRequest(request.nodeId);
  }
}

export function cancelFocusComponentRequest() {
  const previousRequest = pendingFocusRequest;
  pendingFocusRequest = undefined;
  previousRequest?.onFinished?.();
}

/** Tries direct focus, cancelling any older pending request. Returns false if navigation is needed. */
export function tryFocusComponent(request: FocusComponentRequest) {
  cancelFocusComponentRequest();
  return focusRegisteredComponent(request);
}

export function useHandleFocusComponent(nodeId: string, containerDivRef: React.RefObject<HTMLDivElement | null>) {
  const focus = useCallback(
    (binding: string | null) => {
      const div = containerDivRef.current;
      const field = findElementToFocus(div, binding);
      if (!div || !field?.isConnected) {
        return false;
      }

      field.focus();
      if (document.activeElement !== field) {
        return false;
      }
      div.scrollIntoView({ behavior: 'instant' });
      return true;
    },
    [containerDivRef],
  );

  const handleContainerMount = useCallback(() => {
    // On the first mount, wait for child effects before focusing.
    if (focusComponentHandlers.get(nodeId)?.has(focus)) {
      tryPendingFocusRequest(nodeId);
    }
  }, [focus, nodeId]);

  useEffect(() => {
    const handlers = focusComponentHandlers.get(nodeId) ?? new Set<FocusHandler>();
    handlers.add(focus);
    focusComponentHandlers.set(nodeId, handlers);
    tryPendingFocusRequest(nodeId);
    return () => {
      handlers.delete(focus);
      if (handlers.size === 0) {
        focusComponentHandlers.delete(nodeId);
      }
    };
  }, [focus, nodeId]);

  return handleContainerMount;
}

export function FocusComponentRequestFromUrl() {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nodeId = params.get(SearchParams.FocusComponentId);
    setFocusComponentRequest(
      nodeId ? { nodeId, errorBinding: params.get(SearchParams.FocusErrorBinding) } : undefined,
      () => {
        setSearchParams((currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          nextParams.delete(SearchParams.FocusComponentId);
          nextParams.delete(SearchParams.FocusErrorBinding);
          return nextParams;
        }, replaceAndPreventResetOptions);
      },
    );

    return () => setFocusComponentRequest(undefined);
  }, [location, setSearchParams]);

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
