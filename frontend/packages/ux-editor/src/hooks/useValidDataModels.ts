import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useDataModelMetadataQuery } from './queries/useDataModelMetadataQuery';
import { useAppContext } from './useAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { getDataModel, validateSelectedDataModel } from '../utils/dataModelUtils';

export const useValidDataModels = (currentDataModel: string) => {
  const { selectedFormLayoutSetName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();

  const { data: dataModels, isPending: dataModelsIsPending } = useAppMetadataModelIdsQuery(
    org,
    app,
    false,
  );

  const isDataModelValid = validateSelectedDataModel(currentDataModel, dataModels);

  const { data: dataModelMetadata, isPending: dataModelMetaDataIsPending } =
    useDataModelMetadataQuery(
      {
        org,
        app,
        layoutSetName: selectedFormLayoutSetName,
        dataModelName: isDataModelValid ? currentDataModel : '',
      },
      { enabled: !dataModelsIsPending },
    );

  return {
    dataModels,
    selectedDataModel: getDataModel(isDataModelValid, dataModelMetadata, currentDataModel),
    dataModelMetadata,
    isLoadingDataModels: dataModelsIsPending || dataModelMetaDataIsPending,
    isDataModelValid,
  };
};
