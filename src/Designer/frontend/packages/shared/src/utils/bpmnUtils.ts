import type BpmnModdle from 'bpmn-moddle';

type Definitions = BpmnModdle.Definitions;
type Process = BpmnModdle.Process;
type FlowElement = BpmnModdle.FlowElement;
type BaseElement = BpmnModdle.BaseElement;

// Adds custom properties that fall outside the BPMN specification.
type ExtensionElement = BaseElement & {
  $children?: ExtensionElement[];
  $body?: string;
};

const updateDataTypesToSign = (
  definitions: Definitions,
  callback: (element: ExtensionElement) => void,
) => {
  (definitions.rootElements[0] as Process).flowElements
    .filter((flowElement: FlowElement) => flowElement.$type === 'bpmn:Task')
    .forEach((flowElement: FlowElement) => {
      (flowElement.extensionElements.values[0] as ExtensionElement).$children
        ?.filter((child: ExtensionElement) => (child.$type as string) === 'altinn:signatureConfig')
        .forEach((child: ExtensionElement) => {
          child.$children
            ?.filter(
              (subChild: ExtensionElement) =>
                (subChild.$type as string) === 'altinn:dataTypesToSign',
            )
            .forEach((subChild: ExtensionElement) => {
              callback(subChild);
            });
        });
    });
};

export const removeDataTypeIdsToSign = (dataTypeIds: string[]) => {
  return (definitions: Definitions) => {
    let hasChanged = false;

    updateDataTypesToSign(definitions, (dataTypeToSign: ExtensionElement) => {
      const filteredChildren = dataTypeToSign.$children?.filter(
        (item: ExtensionElement) => !dataTypeIds.includes(item.$body ?? ''),
      );
      if (filteredChildren?.length !== dataTypeToSign.$children?.length) {
        hasChanged = true;
        dataTypeToSign.$children = filteredChildren;
      }
    });

    return hasChanged;
  };
};

export const updateDataTypeIdsToSign = (
  dataTypeIds: {
    oldId: string;
    newId: string;
  }[],
) => {
  return (definitions: Definitions) => {
    let hasChanged = false;

    updateDataTypesToSign(definitions, (dataTypeToSign: ExtensionElement) => {
      const filteredChildren = dataTypeToSign.$children?.filter((item: ExtensionElement) =>
        dataTypeIds.some((dataTypeId) => dataTypeId.oldId === item.$body),
      );
      if (filteredChildren?.length > 0) {
        hasChanged = true;
        dataTypeToSign.$children = dataTypeToSign.$children?.map((item: ExtensionElement) => {
          const dataTypeId = dataTypeIds.find((dataTypeId) => dataTypeId.oldId === item.$body);
          if (dataTypeId) {
            hasChanged = true;
            item.$body = dataTypeId.newId;
          }

          return item;
        });
      }
    });

    return hasChanged;
  };
};
