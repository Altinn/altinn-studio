import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { TaskUtils } from '../../../../utils/taskUtils';

export const useGetDefaultUserControlledSigningInterfaceId = (): string | null => {
  const { bpmnDetails } = useBpmnContext();
  return TaskUtils.getTaskExtension(bpmnDetails.element)?.signatureConfig?.signeeProviderId;
};
