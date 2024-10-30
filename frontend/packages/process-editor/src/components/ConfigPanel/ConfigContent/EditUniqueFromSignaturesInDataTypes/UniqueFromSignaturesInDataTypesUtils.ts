import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { BpmnDetails } from '../../../../types/BpmnDetails';

export const updateDataTypes = (
  bpmnFactory: BpmnFactory,
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  updatedDataTypes: string[],
) => {
  let uniqueFromSignaturesInDataTypesElement: ModdleElement =
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig
      ?.uniqueFromSignaturesInDataTypes;

  if (!uniqueFromSignaturesInDataTypesElement) {
    uniqueFromSignaturesInDataTypesElement = bpmnFactory.create(
      'altinn:UniqueFromSignaturesInDataTypes',
    );
  }

  uniqueFromSignaturesInDataTypesElement.dataTypes = updatedDataTypes.map((dataType) =>
    bpmnFactory.create('altinn:DataType', {
      dataType,
    }),
  );

  updateUniqueFromSignaturesInDataTypes(
    modeling,
    bpmnDetails,
    uniqueFromSignaturesInDataTypesElement,
  );
};

const updateUniqueFromSignaturesInDataTypes = (
  modeling: Modeling,
  bpmnDetails: BpmnDetails,
  uniqueFromSignaturesInDataTypesElement: ModdleElement,
) => {
  modeling.updateModdleProperties(
    bpmnDetails.element,
    bpmnDetails.element.businessObject.extensionElements.values[0].signatureConfig,
    {
      uniqueFromSignaturesInDataTypes: uniqueFromSignaturesInDataTypesElement,
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
