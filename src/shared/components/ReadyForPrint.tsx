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

    const imageLoadPromise = (img: HTMLImageElement) => {
      return new Promise((res) => {
        img.addEventListener('load', res);
        img.addEventListener('error', res);
      });
    };

    document.querySelectorAll('img').forEach((image) => {
      image.complete || promises.push(imageLoadPromise(image));
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
