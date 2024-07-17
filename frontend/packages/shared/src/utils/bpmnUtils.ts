const updateDataTypesToSign = (definitions, callback) => {
  definitions.rootElements[0].flowElements
    .filter((flowElement) => flowElement.$type === 'bpmn:Task')
    .forEach((flowElement) => {
      flowElement.extensionElements.values[0].$children
        .filter((child) => child.$type === 'altinn:signatureConfig')
        .forEach((child) => {
          child.$children
            ?.filter((subChild) => subChild.$type === 'altinn:dataTypesToSign')
            .forEach((subChild) => {
              callback(subChild);
            });
        });
    });
};

export const removeDataTypeIdsToSign = (dataTypeIds: string[]) => {
  return (definitions) => {
    let hasChanged = false;

    updateDataTypesToSign(definitions, (dataTypeToSign) => {
      const filteredChildren = dataTypeToSign.$children?.filter(
        (item) => !dataTypeIds.includes(item.$body),
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
  return (definitions) => {
    let hasChanged = false;

    updateDataTypesToSign(definitions, (dataTypeToSign) => {
      const filteredChildren = dataTypeToSign.$children?.filter((item) =>
        dataTypeIds.some((dataTypeId) => dataTypeId.oldId === item.$body),
      );
      if (filteredChildren?.length > 0) {
        hasChanged = true;
        dataTypeToSign.$children = dataTypeToSign.$children?.map((item) => {
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
