import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { TaskUtils } from '../../utils/taskUtils';

export const useUpdateDataTypesToSign = () => {
  const { bpmnDetails, modelerRef } = useBpmnContext();

  return (dataTypes: string[]): void => {
    const { element } = bpmnDetails;
    const taskExtension = TaskUtils.getTaskExtension(element);
    const modeling: Modeling = modelerRef.current.get('modeling');
    const bpmnFactory: BpmnFactory = modelerRef.current.get('bpmnFactory');
    const dataTypesToSign = bpmnFactory.create('altinn:DataTypesToSign', {
      dataTypes: dataTypes.map((dataType) => bpmnFactory.create('altinn:DataType', { dataType })),
    });

    if (taskExtension.signatureConfig) {
      modeling.updateModdleProperties(element, taskExtension.signatureConfig, { dataTypesToSign });
    } else {
      modeling.updateModdleProperties(element, taskExtension, {
        signatureConfig: bpmnFactory.create('altinn:SignatureConfig', { dataTypesToSign }),
      });
    }
  };
};
