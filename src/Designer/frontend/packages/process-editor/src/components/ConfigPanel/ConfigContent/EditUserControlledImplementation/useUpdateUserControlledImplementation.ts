import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';
import { TaskUtils } from '../../../../utils/taskUtils';

type UpdateUserControlledImplementation = (value: string) => void;

export const useUpdateUserControlledImplementation = (): UpdateUserControlledImplementation => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  return (value: string) => {
    const modeling: Modeling = modelerRef.current.get('modeling');
    updateImplementation(modeling, value, bpmnDetails);
  };
};

function updateImplementation(modeling: Modeling, value: string, bpmnDetails: BpmnDetails): void {
  BpmnGuard.ensureHasSignatureConfig(bpmnDetails.element);

  modeling.updateModdleProperties(
    bpmnDetails.element,
    TaskUtils.getTaskExtension(bpmnDetails.element).signatureConfig,
    {
      signeeProviderId: value,
    },
  );
}
