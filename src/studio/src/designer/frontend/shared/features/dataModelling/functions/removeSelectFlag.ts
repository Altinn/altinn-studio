import { IDataModelMetadataItem } from "../sagas/metadata/dataModelsMetadataSlice";

function removeSelectFlag(metadataOptions: IDataModelMetadataItem[]) {
  return metadataOptions.map((v) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { select, ...value } = v;
    return ({
      ...v,
      value,
    });
  });
}

export default removeSelectFlag;
