import React from 'react';

import { useDataLoadingStore } from 'src/core/contexts/dataLoadingContext';
import { waitForAnimationFrames } from 'src/utils/waitForAnimationFrames';
import type { DataLoading } from 'src/core/contexts/dataLoadingContext';

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
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);
  const dataLoadingIsDone = useDataLoadingStore((state) => state.isDone);

  React.useLayoutEffect(() => {
    if (assetsLoaded) {
      return;
    }

    const dataPromise = waitForDataLoading(dataLoadingIsDone);
    const imagePromise = waitForImages();
    const fontPromise = document.fonts.ready;

    Promise.all([imagePromise, fontPromise, dataPromise]).then(() => {
      setAssetsLoaded(true);
    });
  }, [assetsLoaded, dataLoadingIsDone]);

  if (!assetsLoaded) {
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

async function waitForDataLoading(dataLoadingIsDone: DataLoading['isDone']) {
  let done: boolean = dataLoadingIsDone();

  while (!done) {
    await new Promise((resolve) => window.requestIdleCallback(resolve, { timeout: 100 }));
    done = dataLoadingIsDone();
  }
}
