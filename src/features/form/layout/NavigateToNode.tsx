import React, { useCallback, useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { Hidden } from 'src/utils/layout/NodesContext';
import type { NodeRefValidation } from 'src/features/validation';
import type { NavigateToPageOptions } from 'src/hooks/useNavigatePage';

type NavigationHandler = (
  indexedId: string,
  baseComponentId: string,
  options: NavigateToComponentOptions | undefined,
) => Promise<boolean>;
type FinishNavigationHandler = (
  indexedId: string,
  baseComponentId: string,
  options: NavigateToComponentOptions | undefined,
  whenHit: () => void,
) => Promise<NavigationResult | void>;

export enum NavigationResult {
  Timeout = 'timeout',
  ComponentIsHidden = 'componentIsHidden',
  SuccessfulNoFocus = 'successfulNoFocus',
  SuccessfulFailedToRender = 'successfulFailedToRender',
  SuccessfulWithFocus = 'successfulWithFocus',
}

export interface NavigateToComponentOptions {
  shouldFocus?: boolean;
  pageNavOptions?: NavigateToPageOptions;
  error?: NodeRefValidation;
}

interface ComponentNavigationContext {
  /**
   * Start navigating to the given component. If it's not found or is hidden, the navigation will be canceled.
   * If no navigation handlers are registered to handle navigating to it, the navigation will also be canceled
   * after a short delay.
   */
  navigateTo: (
    indexedId: string,
    baseComponentId: string,
    options?: NavigateToComponentOptions,
  ) => Promise<NavigationResult>;

  /**
   * Registers a function that tries to change some internal state in its own context in order to help navigate
   * to a component. For example by navigating to a page, or opening a repeating group for editing. The callback
   * runs as soon as possible whenever we're supposed to navigate to a component and is forgotten after that.
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

const { Provider, useCtx } = createContext<ComponentNavigationContext>({
  name: 'PageNavigationContext',
  required: true,
});

interface NavigationRequest {
  onHandlerAdded: (handler: NavigationHandler) => Promise<void>;
  onFinishedHandlerAdded: (handler: FinishNavigationHandler) => Promise<void>;
}

type HandlerRegistry<T> = Set<T>;

export function NavigateToComponentProvider({ children }: PropsWithChildren) {
  const request = useRef<NavigationRequest | undefined>();
  const navigationHandlers = useRef<HandlerRegistry<NavigationHandler>>(new Set());
  const finishHandlers = useRef<HandlerRegistry<FinishNavigationHandler>>(new Set());
  const isHidden = Hidden.useIsHiddenSelector();

  const navigateTo = useCallback(
    async (indexedId: string, baseComponentId: string, options?: NavigateToComponentOptions) =>
      new Promise<NavigationResult>((resolve) => {
        if (isHidden(indexedId, 'node')) {
          resolve(NavigationResult.ComponentIsHidden);
          return;
        }

        (async () => {
          let finished = false;
          let lastTick = Date.now();

          const onHandlerAdded = async (handler: NavigationHandler) => {
            if (finished) {
              return;
            }
            if (await handler(indexedId, baseComponentId, options)) {
              lastTick = Date.now();
            }
          };
          const onFinishedHandlerAdded = async (handler: FinishNavigationHandler) => {
            if (finished) {
              return;
            }
            const result = await handler(indexedId, baseComponentId, options, () => {
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
            await onHandlerAdded(handler);
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
    [isHidden],
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

export const useNavigateTo = () => useCtx().navigateTo;

export const useRegisterNavigationHandler = (handler: NavigationHandler) => {
  const { registerNavigationHandler, unregisterNavigationHandler } = useCtx();

  useEffect(() => {
    registerNavigationHandler(handler);
    return () => unregisterNavigationHandler(handler);
  }, [registerNavigationHandler, unregisterNavigationHandler, handler]);
};

export const useFinishNavigation = (handler: FinishNavigationHandler) => {
  const { registerFinishNavigation, unregisterFinishNavigation } = useCtx();

  useEffect(() => {
    registerFinishNavigation(handler);
    return () => unregisterFinishNavigation(handler);
  }, [registerFinishNavigation, unregisterFinishNavigation, handler]);
};
