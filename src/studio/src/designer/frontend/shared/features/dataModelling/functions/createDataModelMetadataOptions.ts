import { IDataModelsMetadataState, IDataModelMetadataItem } from "../sagas/metadata";
import { IMetadataOption } from "./types";

function createDataModelMetadataOptions(
  { dataModelsMetadataState }: { dataModelsMetadataState: IDataModelsMetadataState },
): IMetadataOption[] {
  const { dataModelsMetadata } = dataModelsMetadataState;
  return dataModelsMetadata?.length
    ? dataModelsMetadata.flatMap((value: IDataModelMetadataItem) => {
      const label = value?.fileName?.split('.schema')[0];
      return label ? [{ value, label }] : [];
    }) : [];
}

export default createDataModelMetadataOptions;
