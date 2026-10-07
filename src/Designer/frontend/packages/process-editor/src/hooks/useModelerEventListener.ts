import { useEffect } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';

/** Use a stable callback to avoid subscribing again on each render. */
export function useModelerEventListener<Event>(
  eventName: string,
  callback: (event: Event) => void,
): void {
  const { modelerRef, isInitialized } = useBpmnContext();

  useEffect(() => {
    if (isInitialized) {
      const modeler = modelerRef.current;
      modeler.on(eventName, callback);
      return () => modeler.off(eventName, callback);
    }
  }, [isInitialized, eventName, callback, modelerRef]);
}
