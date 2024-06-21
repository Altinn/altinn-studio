import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useDataModelMetadataQuery } from './queries/useDataModelMetadataQuery';
import { useAppContext } from './useAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { validateSelectedDataModel } from '../utils/dataModel';

export const useValidDataModels = (currentDataModel: string) => {
  const { selectedFormLayoutSetName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();

  const { data: dataModels, isPending: dataModelsIsPending } = useAppMetadataModelIdsQuery(
    org,
    app,
    false,
  );

  const isDataModelValid = validateSelectedDataModel(currentDataModel, dataModels);

  const { data: dataModelMetaData, isPending: dataModelMetaDataIsPending } =
    useDataModelMetadataQuery(
      org,
      app,
      selectedFormLayoutSetName,
      isDataModelValid ? currentDataModel : undefined,
    );

  return {
    dataModels,
    selectedDataModel: isDataModelValid ? currentDataModel : dataModelMetaData[0]?.id,
    dataModelMetaData,
    isLoadingDataModels: dataModelsIsPending || dataModelMetaDataIsPending,
    isDataModelValid,
  };
};
