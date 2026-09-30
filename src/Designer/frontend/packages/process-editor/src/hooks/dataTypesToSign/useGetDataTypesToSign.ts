import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { TaskUtils } from '../../utils/taskUtils';

export const useGetDataTypesToSign = () => {
  const { availableDataTypeIds } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();

  return (
    TaskUtils.getTaskExtension(bpmnDetails.element)
      ?.signatureConfig?.dataTypesToSign?.dataTypes?.filter((item: ModdleElement) =>
        availableDataTypeIds.includes(item.dataType),
      )
      ?.map((element: ModdleElement) => element.dataType) || []
  );
};
