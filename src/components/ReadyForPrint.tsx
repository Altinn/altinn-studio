import React from 'react';

/**
 * This element only serves to let our PDF generator know the app is ready and have rendered its content.
 * It should be included in the app DOM for every possible execution path, except those where we're showing
 * loading indicators to the user while waiting for content to get ready.
 */
export function ReadyForPrint() {
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);

  React.useLayoutEffect(() => {
    const imagePromise = waitForImages();
    const fontPromise = document.fonts.ready;

    Promise.all([imagePromise, fontPromise]).then(() => {
      setAssetsLoaded(true);
    });
  }, []);

  if (!assetsLoaded) {
    return null;
  }

  return (
    <div
      style={{ display: 'none' }}
      id='readyForPrint'
    />
  );
}

function loadPromise(element: HTMLImageElement | HTMLLinkElement) {
  return new Promise((res) => {
    element.addEventListener('load', res);
    element.addEventListener('error', res);
  });
}

async function waitForAnimationFrames(n: number) {
  for (let i = 0; i < n; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
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
