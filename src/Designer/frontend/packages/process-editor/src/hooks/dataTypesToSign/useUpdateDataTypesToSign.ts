import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { BpmnDetails } from '../../types/BpmnDetails';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { useDebounce } from '@studio/hooks';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { TaskUtils } from '../../utils/taskUtils';

const updateDataTypes = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  updatedDataTypes: string[],
) => {
  const dataTypesToSignElement: ModdleElement = TaskUtils.getTaskExtension(bpmnDetails.element)
    .signatureConfig?.dataTypesToSign;

  dataTypesToSignElement.dataTypes = updatedDataTypes.map((dataType) =>
    bpmnFactory.create('altinn:DataType', {
      dataType,
    }),
  );

  updateDataTypesToSign(modeling, bpmnDetails, dataTypesToSignElement);
};

const updateDataTypesToSign = (
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  dataTypesToSignElement: ModdleElement,
) => {
  modeling.updateModdleProperties(
    bpmnDetails.element,
    TaskUtils.getTaskExtension(bpmnDetails.element).signatureConfig,
    {
      dataTypesToSign: dataTypesToSignElement,
    },
  );
};

export const useUpdateDataTypesToSign = () => {
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });

  return (dataTypes: string[]) => {
    const modelerInstance = modelerRef.current;
    const modeling: Modeling = modelerInstance.get('modeling');
    const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');
    debounce(() => updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes));
  };
};
