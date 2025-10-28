import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useDataModelMetadataQuery } from './queries/useDataModelMetadataQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { getDataModel, validateSelectedDataModel } from '../utils/dataModelUtils';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import useUxEditorParams from './useUxEditorParams';

export const useValidDataModels = (currentDataModel: string) => {
  const { layoutSet } = useUxEditorParams();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const {
    data: dataModels,
    isPending: isPendingDataModels,
    isRefetching: isFetchingDataModels,
  } = useAppMetadataModelIdsQuery(org, app, false);

  const dataModel = Boolean(currentDataModel)
    ? currentDataModel
    : (layoutSets?.sets.find((set) => set.id === layoutSet)?.dataType ?? dataModels?.[0]);

  const isDataModelValid = validateSelectedDataModel(dataModel, dataModels);
  const { data: dataModelMetadata, isPending: isPendingDataModelMetadata } =
    useDataModelMetadataQuery(
      {
        org,
        app,
        layoutSetName: layoutSet,
        dataModelName: isDataModelValid ? dataModel : dataModels?.[0],
      },
      { enabled: !isPendingDataModels && !isFetchingDataModels },
    );

  return {
    dataModels,
    selectedDataModel: getDataModel(isDataModelValid, dataModel, currentDataModel),
    dataModelMetadata,
    isLoadingDataModels: isPendingDataModels || isPendingDataModelMetadata,
    isDataModelValid,
  };
};
