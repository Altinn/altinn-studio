import { useEffect } from 'react';
import type { RefObject } from 'react';
import {
  noPreviewComponentErrors,
  parseStudioBridgeMessage,
  type PreviewComponentErrors,
} from './studioBridge';

/**
 * Keeps the errors that the Studio bridge in the preview frame reports. Any page can post messages to Studio's window,
 * so only those from the frame's window, on preview's origin, count.
 */
export const useStudioBridge = (
  frameRef: RefObject<HTMLIFrameElement | null>,
  previewOrigin: string | undefined,
  setComponentErrors: (errors: PreviewComponentErrors) => void,
): void => {
  useEffect(() => {
    if (!previewOrigin) return;
    const listener = (event: MessageEvent): void => {
      if (event.origin !== previewOrigin || event.source !== frameRef.current?.contentWindow)
        return;
      const message = parseStudioBridgeMessage(event.data);
      if (!message) return;
      setComponentErrors(
        message.type === 'componentErrors' ? message.errors : noPreviewComponentErrors,
      );
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [frameRef, previewOrigin, setComponentErrors]);
};
