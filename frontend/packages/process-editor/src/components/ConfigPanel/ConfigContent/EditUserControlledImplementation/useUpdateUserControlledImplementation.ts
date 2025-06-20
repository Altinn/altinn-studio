import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';

type UpdateUserControlledImplementation = (value: string) => void;

export const useUpdateUserControlledImplementation = (): UpdateUserControlledImplementation => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  return (value: string) => updateImplementation(modeling, value, bpmnDetails);
};

function updateImplementation(modeling: Modeling, value: string, bpmnDetails: BpmnDetails): void {
  BpmnGuard.ensureHasSignatureConfig(bpmnDetails.element);

  modeling.updateModdleProperties(
    bpmnDetails.element,
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig,
    {
      signeeProviderId: value,
    },
  );
}
