import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';
import type React from 'react';

import { SearchParams } from 'src/core/routing/types';

export type FocusComponentRequest = {
  nodeId: string;
  errorBinding: string | null;
};

const focusComponentRequestStateKey = 'focusComponentRequest';

export function withFocusComponentRequestState(state: unknown, request: FocusComponentRequest) {
  const previousState = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  return { ...previousState, [focusComponentRequestStateKey]: request };
}

function getFocusComponentRequestFromState(state: unknown): FocusComponentRequest | undefined {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return undefined;
  }

  const request = (state as Record<string, unknown>)[focusComponentRequestStateKey];
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return undefined;
  }

  const { nodeId, errorBinding } = request as Record<string, unknown>;
  return typeof nodeId === 'string' && (typeof errorBinding === 'string' || errorBinding === null)
    ? { nodeId, errorBinding }
    : undefined;
}

type FocusHandler = (binding: string | null) => boolean;

const focusComponentHandlers = new Map<string, Set<FocusHandler>>();
const focusRequestListeners = new Set<() => void>();
let pendingFocusRequest: FocusComponentRequest | undefined;

function publishFocusRequest(request: FocusComponentRequest | undefined) {
  pendingFocusRequest = request;
  for (const listener of focusRequestListeners) {
    listener();
  }
}

function subscribeToFocusRequest(listener: () => void) {
  focusRequestListeners.add(listener);
  return () => focusRequestListeners.delete(listener);
}

function getFocusRequestSnapshot() {
  return pendingFocusRequest;
}

function getServerFocusRequestSnapshot() {
  return undefined;
}

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
    publishFocusRequest(undefined);
  }
}

export function setFocusComponentRequest(request: FocusComponentRequest | undefined) {
  publishFocusRequest(request);
  if (request) {
    tryPendingFocusRequest(request.nodeId);
  }
}

export function cancelFocusComponentRequest() {
  publishFocusRequest(undefined);
}

/** Subscribes structural components that must reveal a requested field before it can mount. */
export function useFocusComponentRequest() {
  return useSyncExternalStore(subscribeToFocusRequest, getFocusRequestSnapshot, getServerFocusRequestSnapshot);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nodeId = params.get(SearchParams.FocusComponentId);
    const requestFromUrl = nodeId ? { nodeId, errorBinding: params.get(SearchParams.FocusErrorBinding) } : undefined;
    setFocusComponentRequest(getFocusComponentRequestFromState(location.state) ?? requestFromUrl);

    return () => setFocusComponentRequest(undefined);
  }, [location.key, location.search, location.state]);

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
