import { useCallback, useState } from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useModelerEventListener } from '../../../../hooks/useModelerEventListener';
import type { FiksArkivProcessShapeIssue } from './fiksArkivProcessShape';
import { getFiksArkivProcessShapeIssue } from './fiksArkivProcessShape';

/**
 * The process shape issue of the selected task, re-read on every `commandStack.changed` since the
 * bpmn-js elements are mutated in place (undo and redo change the shape under an open panel).
 */
export const useFiksArkivProcessShape = (): FiksArkivProcessShapeIssue | undefined => {
  const { bpmnDetails } = useBpmnContext();

  const [, setDiagramVersion] = useState<number>(0);
  const handleDiagramChange = useCallback(
    (): void => setDiagramVersion((version) => version + 1),
    [],
  );
  useModelerEventListener<void>('commandStack.changed', handleDiagramChange);

  return getFiksArkivProcessShapeIssue(bpmnDetails.element);
};
