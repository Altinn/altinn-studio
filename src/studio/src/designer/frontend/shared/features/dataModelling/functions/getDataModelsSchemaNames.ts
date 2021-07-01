import { IDatamodelsMetadataState } from "../sagas/datamodelsMetadata/datamodelsMetadataSlice";

const getDatamodelsSchemaNames = (state: any) => {
  const metaDataState = (state.repoMetadataState as IDatamodelsMetadataState);
  return metaDataState.datamodelsMetadata?.length
    ? metaDataState.datamodelsMetadata.map((d: { fileName: string }) => {
      const id = d.fileName.split('.')[0];
      return {
        value: {
          ...d,
          id,
        },
        label: id,
      };
    }) : [];
};

export default getDatamodelsSchemaNames;
