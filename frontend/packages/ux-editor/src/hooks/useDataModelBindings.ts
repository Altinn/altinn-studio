import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useDataModelMetadataQuery } from './queries/useDataModelMetadataQuery';
import { useAppContext } from './useAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  filterDataModelFields,
  validateSelectedDataField,
  validateSelectedDataModel,
  type InternalBindingFormat,
} from '../utils/dataModel';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';

type UseDataModelBindings = {
  bindingFormat: InternalBindingFormat;
  dataModelFieldsFilter?: (dataModelField: DataModelFieldElement) => boolean;
};

export const useDataModelBindings = ({
  bindingFormat,
  dataModelFieldsFilter,
}: UseDataModelBindings) => {
  const { property: selectedDataField, dataType: selectedDataModel } = bindingFormat;

  const { selectedFormLayoutSetName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();

  const { data: dataModels, isPending: dataModelsArePending } = useAppMetadataModelIdsQuery(
    org,
    app,
    false,
  );

  const isDataModelValid = validateSelectedDataModel(selectedDataModel, dataModels);

  const { data: dataModelMetaData, isPending: dataFieldsArePending } = useDataModelMetadataQuery(
    org,
    app,
    selectedFormLayoutSetName,
    isDataModelValid ? selectedDataModel : undefined,
  );

  const dataModelFields = filterDataModelFields(dataModelFieldsFilter, dataModelMetaData);
  const isDataFieldValid = validateSelectedDataField(selectedDataField, dataModelFields);
  console.log(isDataFieldValid);
  return {
    isLoading: dataFieldsArePending || dataModelsArePending,
    isBindingError: !isDataModelValid || !isDataFieldValid,
    dataModel: isDataModelValid ? selectedDataModel : dataModelMetaData[0]?.id,
    dataModelField: selectedDataField,
    dataModels,
    dataModelFields,
    dataModelMetaData,
  };
};
