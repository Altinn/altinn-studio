import { useCallback, useState } from 'react';
import { useModelerEventListener } from './useModelerEventListener';

/** Graph-dependent panels also change when a neighboring element is edited, undone, or removed. */
export function useBpmnDiagramVersion(): number {
  const [version, setVersion] = useState(0);
  const update = useCallback(() => setVersion((current) => current + 1), []);
  useModelerEventListener<void>('commandStack.changed', update);
  return version;
}
