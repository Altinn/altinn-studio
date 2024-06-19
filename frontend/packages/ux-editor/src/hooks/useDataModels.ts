// import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
// import { useDataModelMetadataQuery } from './queries/useDataModelMetadataQuery';
// import { useAppContext } from './useAppContext';
// import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
// import {
//   filterDataModelFields,
//   validateSelectedDataField,
//   validateSelectedDataModel,
//   type InternalBindingFormat,
// } from '../utils/dataModel';
// import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';

// type UseDataModelBindings = {
//   //   bindingFormat: InternalBindingFormat;
//   //   dataModelFieldsFilter: (dataModelField: DataModelFieldElement) => boolean;
//   selectedDataModel: string;
// };

// export const useDataModels = ({ selectedDataModel }: UseDataModelBindings) => {
//   //   const { property: selectedDataField, dataType: selectedDataModel } = bindingFormat;

//   //   const { selectedFormLayoutSetName } = useAppContext();
//   const { org, app } = useStudioEnvironmentParams();

//   const { data: dataModels, isPending: dataModelsArePending } = useAppMetadataModelIdsQuery(
//     org,
//     app,
//     false,
//   );

//   const isDataModelValid = validateSelectedDataModel(selectedDataModel, dataModels);

//   //   const { data: dataModelFields, isPending: dataFieldsArePending } = useDataModelMetadataQuery(
//   //     org,
//   //     app,
//   //     selectedFormLayoutSetName,
//   //     isDataModelValid ? selectedDataModel : undefined,
//   //   );

//   //   const dataFields = filterDataModelFields(dataModelFieldsFilter, dataModelFields);
//   //   const isDataFieldValid = validateSelectedDataField(selectedDataField, dataFields);

//   return {
//     // isLoading: dataFieldsArePending || dataModelsArePending,
//     // dataModel: isDataModelValid ? selectedDataModel : "dataModelFields[0]?.id",
//     dataModel: isDataModelValid ? selectedDataModel : '',
//     // dataField: isDataFieldValid ? selectedDataField : '',
//     dataModels,
//     isDataModelError: !isDataModelValid,
//     // dataFields,
//     // isBindingError: !isDataModelValid || !isDataFieldValid,
//   };
// };
