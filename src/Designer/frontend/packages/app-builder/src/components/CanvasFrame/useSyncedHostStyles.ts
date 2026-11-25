import { useEffect } from 'react';

const hostStyleSelector = 'style, link[rel="stylesheet"]';

/**
 * Copies the style sheets of the host page into the canvas document, and keeps them in sync while
 * the bundler adds or updates styles. Without this, the CSS modules of the components rendered in
 * the canvas would only exist in the host page. The canvas styles are added last, so they win.
 */
export function useSyncedHostStyles(canvasDocument: Document | null, canvasStyles: string): void {
  useEffect(() => {
    if (!canvasDocument) return;

    const canvasStyleElement = canvasDocument.createElement('style');
    canvasStyleElement.textContent = canvasStyles;
    let copies: Node[] = [];

    const sync = (): void => {
      copies.forEach((copy) => copy.parentNode?.removeChild(copy));
      copies = Array.from(document.head.querySelectorAll(hostStyleSelector)).map((node) =>
        canvasDocument.head.appendChild(canvasDocument.importNode(node, true)),
      );
      canvasDocument.head.appendChild(canvasStyleElement);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      copies.forEach((copy) => copy.parentNode?.removeChild(copy));
      canvasStyleElement.remove();
    };
  }, [canvasDocument, canvasStyles]);
}
