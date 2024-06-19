// import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
// import { useDataModelMetadataQuery } from './queries/useDataModelMetadataQuery';
// import { useAppContext } from './useAppContext';
// import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
// import {
//   filterDataModelFields,
//   validateSelectedDataField,
//   // validateSelectedDataModel,
//   // type InternalBindingFormat,
// } from '../utils/dataModel';
// import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';

// type useDataModelFields = {
//   // bindingFormat: InternalBindingFormat;
//   selectedDataModelField: string;
//   selectedDataModel: string;
//   dataModelFieldsFilter: (dataModelField: DataModelFieldElement) => boolean;
// };

// export const useDataModelFields = ({
//   selectedDataModelField,
//   selectedDataModel,
//   dataModelFieldsFilter,
// }: useDataModelFields) => {

//   const { selectedFormLayoutSetName } = useAppContext();
//   const { org, app } = useStudioEnvironmentParams();

//   const { data, isPending: dataFieldsArePending } = useDataModelMetadataQuery(
//     org,
//     app,
//     selectedFormLayoutSetName,
//     selectedDataModel,
//   );

//   const dataModelFields = filterDataModelFields(dataModelFieldsFilter, data);
//   const isDataModelFieldValid = validateSelectedDataField(selectedDataModelField, dataModelFields);

//   return {
//     dataModelFields,
//     dataField: isDataModelFieldValid ? selectedDataModelField : '',
//     isDataModelFieldError: !isDataModelFieldValid,
//   };
// };
