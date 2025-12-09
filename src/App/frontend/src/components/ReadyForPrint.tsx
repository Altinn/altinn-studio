import React, { useEffect, useState, useTransition } from 'react';

import { useIsFetching } from '@tanstack/react-query';

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

  const isFetching = useIsFetching() > 0;

  const hasLoaders = useHasElementsByAttribute(loadingAttribute);
  const hasErrors = useHasElementsByAttribute(errorAttribute);

  // const is = useIsPdf();

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

  if (!assetsLoaded || hasLoaders || isFetching || isPending || (type === 'print' && hasErrors)) {
    // if (is) {
    //   debugger;
    // }
    return null;
  }

  return (
    <div
      style={{ display: 'none' }}
      id={readyId[type]}
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

  useEffect(() => {
    const updateCount = () => {
      setHasElements(document.querySelector(`[${attribute}]`) != null);
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
