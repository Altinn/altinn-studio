import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { BpmnDetails } from '../../../types/BpmnDetails';

export const updateDataTypes = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  updatedDataTypes: string[],
) => {
  let dataTypesToSignElement: ModdleElement =
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig
      ?.uniqueFromSignaturesInDataTypes;

  if (!dataTypesToSignElement) {
    dataTypesToSignElement = bpmnFactory.create('altinn:UniqueFromSignaturesInDataTypes');
  }

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
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig,
    {
      uniqueFromSignaturesInDataTypes: dataTypesToSignElement,
    },
  );
};

export const getSelectedDataTypes = (bpmnDetails: BpmnDetails): string[] => {
  return (
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig?.uniqueFromSignaturesInDataTypes?.dataTypes?.map(
      (element: ModdleElement) => element.dataType,
    ) || []
  );
};
