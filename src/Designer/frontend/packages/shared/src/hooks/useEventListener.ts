import { useEffect } from 'react';

/**
 * Adds an event listener to the given element or the document body if no element is given. The listener is removed on unmount.
 * @param eventType The event type to listen for.
 * @param action The action to perform when the event is triggered.
 */
export function useEventListener(eventType: string, action: () => void) {
  useEffect(() => {
    window.addEventListener(eventType, action);
    return () => window.removeEventListener(eventType, action);
  }, [eventType, action]);
}
