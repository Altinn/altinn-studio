import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import { type BpmnDetails } from '../../../../types/BpmnDetails';
import { BpmnGuard } from '../../../../utils/bpmnGuard/BpmnGuard';
import { withUpdatedGlobalCorrespondenceResource } from './correspondenceResourceUtils';

export const useUpdateCorrespondenceResource = () => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  return (value: string) => {
    const modeling: Modeling = modelerRef.current.get('modeling');
    const moddle: Moddle = modelerRef.current.get('moddle');
    updateCorrespondenceResource(modeling, moddle, value, bpmnDetails);
  };
};

const updateCorrespondenceResource = (
  modeling: Modeling,
  moddle: Moddle,
  value: string,
  bpmnDetails: BpmnDetails,
): void => {
  BpmnGuard.ensureHasSignatureConfig(bpmnDetails.element);
  const signatureConfig =
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig;

  modeling.updateModdleProperties(bpmnDetails.element, signatureConfig, {
    correspondenceResource: withUpdatedGlobalCorrespondenceResource(
      signatureConfig.correspondenceResource,
      value,
      moddle,
    ),
  });
};
