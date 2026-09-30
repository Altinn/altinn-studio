import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { TaskUtils } from '../../../../utils/taskUtils';

export const updateDataTypes = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  updatedDataTypes: string[],
) => {
  const { element } = bpmnDetails;
  const taskExtension = TaskUtils.getTaskExtension(element);
  const uniqueFromSignaturesInDataTypes = bpmnFactory.create(
    'altinn:UniqueFromSignaturesInDataTypes',
    {
      dataTypes: updatedDataTypes.map((dataType) =>
        bpmnFactory.create('altinn:DataType', { dataType }),
      ),
    },
  );

  if (taskExtension.signatureConfig) {
    modeling.updateModdleProperties(element, taskExtension.signatureConfig, {
      uniqueFromSignaturesInDataTypes,
    });
  } else {
    modeling.updateModdleProperties(element, taskExtension, {
      signatureConfig: bpmnFactory.create('altinn:SignatureConfig', {
        uniqueFromSignaturesInDataTypes,
      }),
    });
  }
};

export const getSelectedDataTypes = (bpmnDetails: BpmnDetails): string[] => {
  return (
    TaskUtils.getTaskExtension(
      bpmnDetails.element,
    )?.signatureConfig?.uniqueFromSignaturesInDataTypes?.dataTypes?.map(
      (element: ModdleElement) => element.dataType,
    ) || []
  );
};
