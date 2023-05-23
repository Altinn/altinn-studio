import { useLayoutEffect, useRef } from 'react';

import escapeRegex from 'escape-string-regexp';

import { useExprContext } from 'src/utils/layout/ExprContext';

interface IUseComponentRefs {
  componentId?: string;
  exact?: boolean;
  callback?: (id: string, ref: HTMLElement) => void;
  cleanupCallback?: (id: string, ref: HTMLElement) => void;
}

/**
 * Allows you to get a list of refs for all main DOM element of a component. You can use a base component id as
 * the input (when exact = false), or use the exact component id to look up the specific component inside
 * repeating groups.
 */
export function useComponentRefs({ componentId, exact = false, callback, cleanupCallback }: IUseComponentRefs) {
  const refs = useRef<HTMLElement[]>([]);
  const hierarchy = useExprContext();

  useLayoutEffect(() => {
    const matcher = componentId ? new RegExp(`^${escapeRegex(componentId)}(-[0-9]+)?$`) : undefined;
    refs.current = [];
    const referenceElements = componentId
      ? document.querySelectorAll(`[data-componentid^="${componentId}"]`)
      : document.querySelectorAll('[data-componentid]');

    referenceElements.forEach((referenceElement) => {
      const id = referenceElement.getAttribute('data-componentid');
      if (!id || (matcher && !matcher.test(id))) {
        return;
      }

      if (exact && componentId !== id) {
        return;
      }

      if (referenceElement instanceof HTMLElement) {
        refs.current.push(referenceElement);

        if (callback) {
          callback(id, referenceElement);
        }
      }
    });

    return () => {
      if (cleanupCallback) {
        for (const ref of refs.current) {
          const id = ref.getAttribute('data-componentid') as string;
          cleanupCallback(id, ref);
        }
      }
    };
  }, [componentId, exact, callback, cleanupCallback, hierarchy]);

  return refs;
}
