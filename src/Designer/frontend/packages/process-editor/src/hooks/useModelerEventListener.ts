import { useEffect } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';

/**
 * Subscribes to one bpmn-js modeler event for as long as the component is mounted.
 *
 * The modeler only exists once the canvas has imported the diagram, so the subscription waits for
 * `isInitialized`. Pass a callback with a stable identity: an inline one re-subscribes on every
 * render.
 */
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
