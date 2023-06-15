import React from 'react';

/**
 * This element only serves to let our PDF generator know the app is ready and have rendered its content.
 * It should be included in the app DOM for every possible execution path, except those where we're showing
 * loading indicators to the user while waiting for content to get ready.
 */
export function ReadyForPrint() {
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);

  React.useLayoutEffect(() => {
    const promises: Promise<unknown>[] = [];

    promises.push(document.fonts.ready);

    const loadPromise = (element: HTMLImageElement | HTMLLinkElement) =>
      new Promise((res) => {
        element.addEventListener('load', res);
        element.addEventListener('error', res);
      });

    document.querySelectorAll('img').forEach((image) => {
      image.complete || promises.push(loadPromise(image));
    });

    document.querySelectorAll('link[rel="stylesheet"]').forEach((link: HTMLLinkElement) => {
      cssHasLoaded(link.href) || promises.push(loadPromise(link));
    });

    Promise.all(promises).then(() => {
      // All images have loaded (or failed to load), but they haven't always been painted/caused a re-render. A request
      // for an animation frame reserves you a slot to execute some code _before the next repaint_, but that might be
      // the repaint where the image was supposed to render. When we call it twice, we're guaranteed to output our
      // element after all images have been rendered.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAssetsLoaded(true);
        });
      });
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

function cssHasLoaded(url: string) {
  const resources = window.performance.getEntriesByType('resource');
  return resources.some((resource) => resource.name === url);
}
