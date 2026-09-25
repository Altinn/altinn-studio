import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { getGlobalCorrespondenceResource } from './correspondenceResourceUtils';
import { TaskUtils } from '../../../../utils/taskUtils';

export const useGetCorrespondenceResource = (): string | null => {
  const { bpmnDetails } = useBpmnContext();
  const correspondenceResources: ModdleElement[] | undefined = TaskUtils.getTaskExtension(
    bpmnDetails.element,
  )?.signatureConfig?.correspondenceResource;
  return getGlobalCorrespondenceResource(correspondenceResources)?.value ?? null;
};
