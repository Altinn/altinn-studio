import type { Definitions, FlowElement, ModdleElement } from 'bpmn-moddle';

const updateDataTypesToSign = (
  definitions: Definitions,
  callback: (element: ModdleElement) => void,
) => {
  definitions.rootElements[0].flowElements
    .filter((flowElement: FlowElement) => flowElement.$type === 'bpmn:Task')
    .forEach((flowElement: FlowElement) => {
      flowElement.extensionElements.values[0].$children
        .filter((child: ModdleElement) => child.$type === 'altinn:signatureConfig')
        .forEach((child: ModdleElement) => {
          child.$children
            ?.filter((subChild: ModdleElement) => subChild.$type === 'altinn:dataTypesToSign')
            .forEach((subChild: ModdleElement) => {
              callback(subChild);
            });
        });
    });
};

export const removeDataTypeIdsToSign = (dataTypeIds: string[]) => {
  return (definitions: Definitions) => {
    let hasChanged = false;

    updateDataTypesToSign(definitions, (dataTypeToSign: ModdleElement) => {
      const filteredChildren = dataTypeToSign.$children?.filter(
        (item: ModdleElement) => !dataTypeIds.includes(item.$body),
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

    updateDataTypesToSign(definitions, (dataTypeToSign: ModdleElement) => {
      const filteredChildren = dataTypeToSign.$children?.filter((item: ModdleElement) =>
        dataTypeIds.some((dataTypeId) => dataTypeId.oldId === item.$body),
      );
      if (filteredChildren?.length > 0) {
        hasChanged = true;
        dataTypeToSign.$children = dataTypeToSign.$children?.map((item: ModdleElement) => {
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
