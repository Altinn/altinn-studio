const createDataModelMetadataOptions = (rootState: any) => {
  const { dataModelsMetadata } = rootState.dataModelsMetadataState;
  return dataModelsMetadata?.length
    ? dataModelsMetadata.flatMap((value: { fileName: string }) => {
      const label = value?.fileName?.split('.')[0];
      return label ? [{ value, label }] : [];
    }) : null;
};

export default createDataModelMetadataOptions;
