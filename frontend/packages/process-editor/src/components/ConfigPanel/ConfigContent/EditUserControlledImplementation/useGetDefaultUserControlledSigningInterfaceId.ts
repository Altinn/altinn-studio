import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';

export const useGetDefaultUserControlledSigningInterfaceId = (): string | null => {
  const { bpmnDetails } = useBpmnContext();
  return bpmnDetails.element.businessObject.extensionElements?.values[0]?.signatureConfig
    ?.signeeProviderId;
};
