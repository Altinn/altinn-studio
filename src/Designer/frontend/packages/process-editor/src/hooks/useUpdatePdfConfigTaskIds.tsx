import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { BpmnDetails } from '../types/BpmnDetails';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { useDebounce } from '@studio/hooks';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';

export const useUpdatePdfConfigTaskIds = () => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });

  return (updatedTaskIds: string[]) =>
    debounce(() => updatePdfConfigTaskIds(bpmnFactory, modeling, bpmnDetails, updatedTaskIds));
};

const updatePdfConfigTaskIds = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  updatedTaskIds: string[],
) => {
  const pdfConfig = bpmnDetails.element.businessObject.extensionElements.values[0].pdfConfig;
  const autoPdfTaskIds = bpmnFactory.create('altinn:AutoPdfTaskIds');

  autoPdfTaskIds.taskIds = updatedTaskIds.map((taskId) =>
    bpmnFactory.create('altinn:TaskId', {
      value: taskId,
    }),
  );

  modeling.updateModdleProperties(bpmnDetails.element, pdfConfig, {
    autoPdfTaskIds: autoPdfTaskIds,
  });
};
