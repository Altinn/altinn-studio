import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import type { ModdleElement } from 'bpmn-moddle';

export const useGetDataTypesToSign = () => {
  const { availableDataTypeIds } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();

  return (
    bpmnDetails.element.businessObject.extensionElements?.values[0].signatureConfig?.dataTypesToSign?.dataTypes
      ?.filter((item: ModdleElement) => availableDataTypeIds.includes(item.dataType))
      ?.map((element: ModdleElement) => element.dataType) || []
  );
};
