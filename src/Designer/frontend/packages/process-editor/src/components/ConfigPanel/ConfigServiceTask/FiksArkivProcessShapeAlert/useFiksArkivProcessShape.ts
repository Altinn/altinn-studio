import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnDiagramVersion } from '../../../../hooks/useBpmnDiagramVersion';
import type { FiksArkivProcessShapeIssue } from './fiksArkivProcessShape';
import { getFiksArkivProcessShapeIssue } from './fiksArkivProcessShape';

/**
 * The process shape issue of the selected task, re-read on every `commandStack.changed` since the
 * bpmn-js elements are mutated in place (undo and redo change the shape under an open panel).
 */
export const useFiksArkivProcessShape = (): FiksArkivProcessShapeIssue | undefined => {
  const { bpmnDetails } = useBpmnContext();

  useBpmnDiagramVersion();

  return getFiksArkivProcessShapeIssue(bpmnDetails.element);
};
