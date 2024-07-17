export const removeDataTypesToSignFromSigningTasks = (dataTypeIds: string[]) => {
  return (definitions) => {
    let hasChanged = false;

    definitions.rootElements[0].flowElements
      .filter((flowElement) => flowElement.$type === 'bpmn:Task')
      .forEach((flowElement) => {
        flowElement.extensionElements.values[0].$children
          .filter((child) => child.$type === 'altinn:signatureConfig')
          .forEach((child) => {
            child.$children
              ?.filter((subChild) => subChild.$type === 'altinn:dataTypesToSign')
              .forEach((subChild) => {
                const filteredChildren = subChild.$children?.filter(
                  (item) => !dataTypeIds.includes(item.$body),
                );
                if (filteredChildren.length !== subChild.$children.length) {
                  hasChanged = true;
                  subChild.$children = filteredChildren;
                }
              });
          });
      });

    return hasChanged;
  };
};
