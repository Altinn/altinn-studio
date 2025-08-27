import { useEffect } from 'react';
import { EventName } from 'app-shared/events/common';

export const useInvalidCacheEvent = (eventHandler: (queryKey: string[]) => void) => {
  useEffect(() => {
    const handleEvent = (event: CustomEvent | Event) => {
      const { queryKey } = (event as CustomEvent).detail;
      eventHandler(queryKey);
    };
    window.addEventListener(EventName.InvalidateCache, handleEvent, false);
    return () => {
      window.removeEventListener(EventName.InvalidateCache, handleEvent, false);
    };
  }, [eventHandler]);
};
