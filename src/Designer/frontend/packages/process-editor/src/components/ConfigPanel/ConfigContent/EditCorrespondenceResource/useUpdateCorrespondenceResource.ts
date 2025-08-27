import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { type BpmnDetails } from '../../../../types/BpmnDetails';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';

export const useUpdateCorrespondenceResource = () => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  return (value: string) => updateCorrespondenceResource(modeling, value, bpmnDetails);
};

const updateCorrespondenceResource = (
  modeling: Modeling,
  value: string,
  bpmnDetails: BpmnDetails,
): void => {
  BpmnGuard.ensureHasSignatureConfig(bpmnDetails.element);
  modeling.updateModdleProperties(
    bpmnDetails.element,
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig,
    {
      correspondenceResource: value,
    },
  );
};
