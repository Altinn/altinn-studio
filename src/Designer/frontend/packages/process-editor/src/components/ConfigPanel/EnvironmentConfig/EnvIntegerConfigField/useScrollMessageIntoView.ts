import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Keeps the element whole in view from the moment it is given a message to show.
 *
 * A validation message is two lines under a field that can sit at the bottom of the configuration
 * panel, past the panel's own scroll. Without this the developer is told what is wrong in a
 * sentence whose first line is all they can see. `nearest` scrolls by the least that makes the
 * block whole, so a field already in view does not move under the cursor.
 *
 * Only when the message appears, never on the render that already had one: a task whose bpmn
 * arrives holding a value the runtime cannot read would otherwise scroll the panel away from its
 * own top the moment it was opened.
 */
export const useScrollMessageIntoView = <TElement extends HTMLElement>(
  message: string,
): RefObject<TElement> => {
  const elementRef = useRef<TElement>(null);
  const previousMessage = useRef<string>(message);

  useEffect(() => {
    const hasNewMessage = !previousMessage.current && !!message;
    previousMessage.current = message;
    if (hasNewMessage) elementRef.current?.scrollIntoView({ block: 'nearest' });
  }, [message]);

  return elementRef;
};
