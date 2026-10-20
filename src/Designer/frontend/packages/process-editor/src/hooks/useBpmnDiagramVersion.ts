import { useCallback, useState } from 'react';
import { useModelerEventListener } from './useModelerEventListener';

/** Refresh panels when connected elements change, including after undo or deletion. */
export function useBpmnDiagramVersion(): number {
  const [version, setVersion] = useState(0);
  const update = useCallback(() => setVersion((current) => current + 1), []);
  useModelerEventListener<void>('commandStack.changed', update);
  return version;
}
