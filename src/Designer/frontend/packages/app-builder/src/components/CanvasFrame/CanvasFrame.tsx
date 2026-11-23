import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import formComponentGlobalStyles from '@app/form-component/styles/global.css?inline';
import { useSyncedHostStyles } from './useSyncedHostStyles';
import classes from './CanvasFrame.module.css';

const canvasDocumentStyles = `
${formComponentGlobalStyles}
body {
  margin: 0;
  background-color: var(--ds-color-neutral-background-default);
}
`;

const emptyDocument = '<!doctype html><html lang="nb"><head></head><body></body></html>';

export type CanvasFrameProps = PropsWithChildren<{
  title: string;
}>;

/**
 * Renders its children into an iframe on the same origin. The iframe keeps the app's global styles
 * away from Studio, and lets the app's breakpoints follow the width of the canvas rather than the
 * window. React renders into it through a portal, so context and events work as usual.
 */
export function CanvasFrame({ title, children }: CanvasFrameProps): ReactElement {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [canvasDocument, setCanvasDocument] = useState<Document | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handleLoad = (): void => setCanvasDocument(frame.contentDocument);
    // Until the srcDoc has loaded, the frame holds an empty about:blank document that also reports
    // complete. Rendering into it would leave the canvas in a document that is replaced: popovers in
    // it, like the date picker's, then throw when they are toggled.
    const document = frame.contentDocument;
    if (document?.URL === 'about:srcdoc' && document.readyState === 'complete' && document.body)
      handleLoad();
    frame.addEventListener('load', handleLoad);
    return () => frame.removeEventListener('load', handleLoad);
  }, []);

  useSyncedHostStyles(canvasDocument, canvasDocumentStyles);

  return (
    <>
      <iframe ref={frameRef} title={title} className={classes.canvasFrame} srcDoc={emptyDocument} />
      {canvasDocument?.body && createPortal(children, canvasDocument.body)}
    </>
  );
}
