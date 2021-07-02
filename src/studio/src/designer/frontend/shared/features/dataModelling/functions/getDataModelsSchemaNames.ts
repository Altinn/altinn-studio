const getDataModelsSchemaNames = (rootState: any) => {
  const { dataModelsMetadata } = rootState.dataModelsMetadataState;
  return dataModelsMetadata?.length
    ? dataModelsMetadata.map((d: { fileName: string }) => {
      const id = d.fileName.split('.')[0];
      return {
        value: {
          ...d,
          id,
        },
        label: id,
      };
    }) : null;
};

export default getDataModelsSchemaNames;
