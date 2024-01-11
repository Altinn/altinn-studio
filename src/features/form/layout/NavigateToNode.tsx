import React, { useCallback, useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type NavigationHandler = (node: LayoutNode) => boolean;
type FinishNavigationHandler = (
  node: LayoutNode,
  shouldFocus: boolean,
  whenHit: () => void,
) => Promise<NavigationResult | void>;

export enum NavigationResult {
  Timeout = 'timeout',
  NodeIsHidden = 'nodeIsHidden',
  SuccessfulNoFocus = 'successfulNoFocus',
  SuccessfulFailedToRender = 'successfulFailedToRender',
  SuccessfulWithFocus = 'successfulWithFocus',
}

interface NodeNavigationContext {
  /**
   * Start navigating to the given node. If the node is not found, or is hidden, the navigation will be cancelled.
   * If no navigation handler are registered to handle navigating to the node, the navigation will also be cancelled
   * after a short delay.
   */
  navigateTo: (node: LayoutNode, shouldFocus?: boolean) => Promise<NavigationResult>;

  /**
   * Registers a function that tries to change some internal state in its own context in order to help navigate
   * to a node. For example by navigating to a page, or opening a repeating group for editing. The callback
   * runs as soon as possible whenever we're supposed to navigate to a node, and is forgotten after that.
   */
  registerNavigationHandler: (handler: NavigationHandler) => void;
  unregisterNavigationHandler: (handler: NavigationHandler) => void;

  /**
   * Call this to indicate that the user has navigated to the node. Returning true from the callback will prevent any
   * navigation handlers from running, and finish the navigation.
   */
  registerFinishNavigation: (handler: FinishNavigationHandler) => void;
  unregisterFinishNavigation: (handler: FinishNavigationHandler) => void;
}

const { Provider, useCtx } = createContext<NodeNavigationContext>({ name: 'PageNavigationContext', required: true });

interface NavigationRequest {
  onHandlerAdded: (handler: NavigationHandler) => void;
  onFinishedHandlerAdded: (handler: FinishNavigationHandler) => Promise<void>;
}

type HandlerRegistry<T> = Set<T>;

export function NavigateToNodeProvider({ children }: PropsWithChildren) {
  const request = useRef<NavigationRequest | undefined>();
  const navigationHandlers = useRef<HandlerRegistry<NavigationHandler>>(new Set());
  const finishHandlers = useRef<HandlerRegistry<FinishNavigationHandler>>(new Set());

  const navigateTo = useCallback(
    async (node: LayoutNode, shouldFocus = true) =>
      new Promise<NavigationResult>((resolve) => {
        if (node.isHidden()) {
          resolve(NavigationResult.NodeIsHidden);
          return;
        }

        (async () => {
          let finished = false;
          let lastTick = Date.now();

          const onHandlerAdded = (handler: NavigationHandler) => {
            if (finished) {
              return;
            }
            if (handler(node)) {
              lastTick = Date.now();
            }
          };
          const onFinishedHandlerAdded = async (handler: FinishNavigationHandler) => {
            if (finished) {
              return;
            }
            const result = await handler(node, shouldFocus, () => {
              // Mark as finished as soon as the component has been hit (i.e. rendered in GenericComponent), even if
              // we haven't actually focused it yet. The focussing requires a ref to the actual rendered element, and
              // it may take some time to reach that stage, and it may even fail if something downstream is hidden.
              // Still, we don't want to keep running handlers after this point.
              finished = true;
            });
            if (result) {
              finished = true;
              resolve(result);
            }
          };

          request.current = {
            onHandlerAdded,
            onFinishedHandlerAdded,
          };

          for (const handler of navigationHandlers.current.values()) {
            onHandlerAdded(handler);
          }
          for (const handler of finishHandlers.current.values()) {
            await onFinishedHandlerAdded(handler);
          }

          const interval = setInterval(() => {
            if (finished) {
              clearInterval(interval);
              return;
            }
            if (Date.now() - lastTick > 1000) {
              finished = true;
              resolve(NavigationResult.Timeout);
            }
          }, 500);
        })();
      }),
    [],
  );

  const registerNavigationHandler = useCallback((handler: NavigationHandler) => {
    navigationHandlers.current.add(handler);
    request.current?.onHandlerAdded?.(handler);
  }, []);

  const unregisterNavigationHandler = useCallback((handler: NavigationHandler) => {
    navigationHandlers.current.delete(handler);
  }, []);

  const registerFinishNavigation = useCallback((handler: FinishNavigationHandler) => {
    finishHandlers.current.add(handler);
    request.current?.onFinishedHandlerAdded?.(handler);
  }, []);

  const unregisterFinishNavigation = useCallback((handler: FinishNavigationHandler) => {
    finishHandlers.current.delete(handler);
  }, []);

  return (
    <Provider
      value={{
        navigateTo,
        registerNavigationHandler,
        unregisterNavigationHandler,
        registerFinishNavigation,
        unregisterFinishNavigation,
      }}
    >
      {children}
    </Provider>
  );
}

export const useNavigateToNode = () => useCtx().navigateTo;

export const useRegisterNodeNavigationHandler = (handler: NavigationHandler) => {
  const { registerNavigationHandler, unregisterNavigationHandler } = useCtx();

  useEffect(() => {
    registerNavigationHandler(handler);
    return () => unregisterNavigationHandler(handler);
  }, [registerNavigationHandler, unregisterNavigationHandler, handler]);
};

export const useFinishNodeNavigation = (handler: FinishNavigationHandler) => {
  const { registerFinishNavigation, unregisterFinishNavigation } = useCtx();

  useEffect(() => {
    registerFinishNavigation(handler);
    return () => unregisterFinishNavigation(handler);
  }, [registerFinishNavigation, unregisterFinishNavigation, handler]);
};
