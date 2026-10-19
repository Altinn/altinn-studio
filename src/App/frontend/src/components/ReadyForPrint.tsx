import React, { useEffect, useRef, useState, useTransition } from 'react';

import { useQueryClient } from 'src/core/queries/reactQuery';
import { waitForAnimationFrames } from 'src/utils/waitForAnimationFrames';

export const loadingAttribute = 'data-loading';
const errorAttribute = 'data-fatal-error';

type ReadyType = 'print' | 'load';
const readyId: Record<ReadyType, string> = {
  print: 'readyForPrint',
  load: 'finishedLoading',
};

/**
 * This element mostly serves to let our PDF generator know the app is ready and have rendered its content. (type: 'print')
 * It is also used for tests, to be able to wait for when the app has finished loading. (type: 'load')
 * It should be included in the app DOM for every possible execution path, except those where we're showing
 * loading indicators to the user while waiting for content to get ready.
 */
export function ReadyForPrint({ type }: { type: ReadyType }) {
  const [isPending] = useTransition();
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);

  const queryClient = useQueryClient();

  const marker = useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const element = marker.current;
    if (!element) {
      return;
    }
    let frame: number | undefined;
    const isBlocked = () =>
      !assetsLoaded ||
      isPending ||
      queryClient.isFetching() > 0 ||
      document.querySelector(
        type === 'print' ? `[${loadingAttribute}], [${errorAttribute}]` : `[${loadingAttribute}]`,
      ) != null;
    const updateReadiness = () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      element.removeAttribute('id');
      if (isBlocked()) {
        return;
      }

      // Query notifications can precede the React commit that renders their result.
      // Let that render settle, then check the live DOM before exposing readiness.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!isBlocked()) {
            element.id = readyId[type];
          }
        });
      });
    };
    const observer = new MutationObserver(updateReadiness);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [loadingAttribute, errorAttribute],
    });
    const unsubscribe = queryClient.getQueryCache().subscribe(updateReadiness);
    updateReadiness();
    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      unsubscribe();
      observer.disconnect();
      element.removeAttribute('id');
    };
  }, [assetsLoaded, isPending, queryClient, type]);

  React.useLayoutEffect(() => {
    if (assetsLoaded) {
      return;
    }

    const imagePromise = waitForImages();
    const fontPromise = document.fonts.ready;

    Promise.all([imagePromise, fontPromise]).then(() => {
      setAssetsLoaded(true);
    });
  }, [assetsLoaded]);

  return (
    <div
      style={{ display: 'none' }}
      ref={marker}
    />
  );
}

function loadPromise(element: HTMLImageElement | HTMLLinkElement) {
  return new Promise((res) => {
    element.addEventListener('load', res);
    element.addEventListener('error', res);
  });
}

async function waitForImages() {
  let nodes: HTMLImageElement[] = [];
  let promises: Promise<unknown>[] = [];
  do {
    await Promise.all(promises);
    await waitForAnimationFrames(2);

    promises = [];
    nodes = [];
    document.querySelectorAll('img').forEach((node) => {
      nodes.push(node);
      !node.complete && promises.push(loadPromise(node));
    });
  } while (nodes.some((node) => !node.complete));
}

export function useHasElementsByAttribute(attribute: string) {
  const [hasElements, setHasElements] = useState(() => document.querySelector(`[${attribute}]`) != null);
  const hasElementsRef = useRef(hasElements);

  useEffect(() => {
    const updateCount = () => {
      const nextHasElements = document.querySelector(`[${attribute}]`) != null;
      if (hasElementsRef.current !== nextHasElements) {
        hasElementsRef.current = nextHasElements;
        setHasElements(nextHasElements);
      }
    };

    const observer = new MutationObserver(updateCount);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [attribute],
    });

    updateCount();

    return () => {
      observer.disconnect();
    };
  }, [attribute]);

  return hasElements;
}
