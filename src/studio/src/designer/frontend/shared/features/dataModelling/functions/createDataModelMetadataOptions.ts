import type { IDataModelMetadataItem, IDataModelsMetadataState } from '../sagas/metadata';
import type { IMetadataOption } from './types';

export function createDataModelMetadataOptions({
  dataModelsMetadataState,
}: {
  dataModelsMetadataState: IDataModelsMetadataState;
}): IMetadataOption[] {
  const { dataModelsMetadata } = dataModelsMetadataState;
  return dataModelsMetadata?.length
    ? dataModelsMetadata.flatMap((value: IDataModelMetadataItem) => {
        const label = value?.fileName?.split('.schema')[0];
        return label ? [{ value, label }] : [];
      })
    : [];
}
