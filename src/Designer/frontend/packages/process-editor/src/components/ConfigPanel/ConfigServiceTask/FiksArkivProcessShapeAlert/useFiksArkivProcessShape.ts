import { useCallback, useState } from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useModelerEventListener } from '../../../../hooks/useModelerEventListener';
import type { FiksArkivProcessShapeIssue } from './fiksArkivProcessShape';
import { getFiksArkivProcessShapeIssue } from './fiksArkivProcessShape';

/**
 * Why the selected task's process shape would stop the app from starting, kept in step with the
 * canvas.
 *
 * The elements the rule reads are the live bpmn-js ones, and they are not reactive: a modeling
 * operation mutates the arrays in place without React hearing about it, so a warning read once at
 * mount would go on answering for a diagram that has since changed. Every such operation passes
 * through the command stack, so re-reading on `commandStack.changed` is what keeps the warning
 * answering for the diagram in front of the developer.
 *
 * Drawing the flow to a new gateway is not the case this covers, however much it looks like it:
 * bpmn-js selects the sequence flow it just created, `handleSelectionChange` in `useBpmnEditor`
 * swaps `bpmnDetails` on every `selection.changed`, and the panel has left the task before the
 * warning could be re-read. Undo and redo are the case: they change the shape of the process while
 * the selection stays on the task, and the warning appears and disappears under an open panel.
 */
export const useFiksArkivProcessShape = (): FiksArkivProcessShapeIssue | undefined => {
  const { bpmnDetails } = useBpmnContext();

  // A counter rather than the issue itself: the value is derived from the diagram, and storing it
  // would mean keeping a second copy of an answer the elements already hold. The identity has to be
  // stable, or the listener would re-subscribe on every render.
  const [, setDiagramVersion] = useState<number>(0);
  const handleDiagramChange = useCallback(
    (): void => setDiagramVersion((version) => version + 1),
    [],
  );
  useModelerEventListener<void>('commandStack.changed', handleDiagramChange);

  return getFiksArkivProcessShapeIssue(bpmnDetails.element);
};
