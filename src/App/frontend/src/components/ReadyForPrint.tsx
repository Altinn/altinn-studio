import React, { useEffect, useRef, useState } from 'react';

import { useIsFetchingData, useIsFetchingDataNow } from 'src/core/queries/useIsFetchingData';
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
 * The hidden element stays mounted while loading. Its ID is only set once the content is ready.
 */
export function ReadyForPrint({ type }: { type: ReadyType }) {
  const ready = useIsReadyForPrint(type);
  return (
    <div
      style={{ display: 'none' }}
      id={ready ? readyId[type] : undefined}
    />
  );
}

function useIsReadyForPrint(type: ReadyType) {
  const assetsLoaded = useAssetsLoaded();
  const isFetching = useIsFetchingData();
  const hasLoaders = useHasElementsByAttribute(loadingAttribute);
  const hasErrors = useHasElementsByAttribute(errorAttribute);
  const isFetchingNow = useIsFetchingDataNow();
  const [settled, setSettled] = useState(false);
  const blocked = !assetsLoaded || isFetching || hasLoaders || (type === 'print' && hasErrors);

  useEffect(() => {
    setSettled(false);
    if (blocked) {
      return;
    }
    let cancelled = false;
    // Wait until query subscribers have committed their result, including any error fallback.
    // Check the live DOM before publishing readiness, rather than retracting it afterwards.
    waitForAnimationFrames(2).then(() => {
      const blockingSelector =
        type === 'print' ? `[${loadingAttribute}], [${errorAttribute}]` : `[${loadingAttribute}]`;
      if (!cancelled && !isFetchingNow() && !document.querySelector(blockingSelector)) {
        setSettled(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [blocked, isFetchingNow, type]);

  return !blocked && settled;
}

function useAssetsLoaded() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([waitForImages(), document.fonts.ready]).then(() => {
      if (!cancelled) {
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return loaded;
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
