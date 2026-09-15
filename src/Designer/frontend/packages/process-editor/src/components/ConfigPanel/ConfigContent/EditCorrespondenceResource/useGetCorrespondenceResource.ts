import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { getGlobalCorrespondenceResource } from './correspondenceResourceUtils';

export const useGetCorrespondenceResource = (): string | null => {
  const { bpmnDetails } = useBpmnContext();
  const correspondenceResources: ModdleElement[] | undefined =
    bpmnDetails.element.businessObject.extensionElements?.values[0]?.signatureConfig
      ?.correspondenceResource;
  return getGlobalCorrespondenceResource(correspondenceResources)?.value ?? null;
};
