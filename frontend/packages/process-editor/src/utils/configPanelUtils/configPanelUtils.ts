import { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { deepCopy } from 'app-shared/pure';
import { BpmnTaskType } from '../../types/BpmnTaskType';
import { DataTypeIdAndTaskId } from '../../types/DataTypeIdAndTaskId';

/**
 * Returns the title to show in the config panel when a task is selected.
 * @param taskType the task type of the bpmn.
 * @returns the correct title key.
 *
 */
export const getConfigTitleKey = (taskType: BpmnTaskType) => {
  return `process_editor.configuration_panel_${taskType ?? 'missing'}_task`;
};

/**
 * Returns the text to show in the config panel helptext based on the tasktype
 * @param taskType the task type of the bpmn
 * @returns the correct helptext key
 */
export const getConfigTitleHelpTextKey = (taskType: BpmnTaskType) => {
  return `process_editor.configuration_panel_header_help_text_${taskType}`;
};

/**
 * Gets the list of all valid data type ids and task ids, returns empty list if no valid found.
 *
 * @param applicationMetadata The application metadata object
 *
 * @returns a list of data type ids and task ids
 */
export const getValidDataTypeIdsAndTaskIds = (
  applicationMetadata: ApplicationMetadata,
): DataTypeIdAndTaskId[] => {
  if (!applicationMetadata.dataTypes) return [];

  const dataTypesWithoutRefDataAsPdf: DataTypeElement[] = filterOutRefDataAsPdf(
    applicationMetadata.dataTypes,
  );

  if (dataTypesWithoutRefDataAsPdf.length === 0) return [];

  return mapDataTypesToDataTypeIdAndTaskIds(dataTypesWithoutRefDataAsPdf);
};

/**
 * Filters out the 'ref-data-as-pdf' data type element from the list as it is not supported yet
 *
 * @param dataTypes the list of DataTypeElement in the application metadata object
 *
 * @returns a filtered list of DataTypeElements
 */
export const filterOutRefDataAsPdf = (dataTypes: DataTypeElement[]): DataTypeElement[] => {
  const unsupportedDataTypes: string[] = ['ref-data-as-pdf'];

  return dataTypes.filter(
    (dataType: DataTypeElement) => !unsupportedDataTypes.includes(dataType.id),
  );
};

/**
 * Maps a list of DataTypeElement object to a list of objects of the DataTypeIdAndTaskId type
 *
 * @param dataTypes the list of data types to map
 *
 * @returns the mapped list of data type ids and task ids
 */
export const mapDataTypesToDataTypeIdAndTaskIds = (
  dataTypes: DataTypeElement[],
): DataTypeIdAndTaskId[] =>
  dataTypes.map((dataType: DataTypeElement) => ({
    dataTypeId: dataType.id,
    taskId: dataType?.taskId ?? '',
  }));

/**
 * Gets the selected data type from the data type and task id list
 *
 * @param bpmnTaskId the ID of the task selected in the bpmn
 * @param dataTypeIdAndTaskId The list of all datatypes with the task ids
 *
 * @returns the list of all data types selected
 */
export const getSelectedDataTypes = (
  bpmnTaskId: string,
  dataTypeIdAndTaskId: DataTypeIdAndTaskId[],
): string[] =>
  dataTypeIdAndTaskId
    .filter((data: DataTypeIdAndTaskId) => data.taskId === bpmnTaskId)
    .map((data: DataTypeIdAndTaskId) => data.dataTypeId);

/**
 * Updates the taskId of the data types in the applciaiton metadata to the
 * id of the selected element from the bpmn.
 *
 * @param applicationMetadata the old applicationMetadata
 * @param bpmnTaskId the ID of the task selected in the bpmn
 * @param selectedTaskIds the selected task IDs from the dropdown
 *
 * @returns updated ApplicationMetadata object
 */
export const getApplicationMetadataWithUpdatedDataTypes = (
  applicationMetadata: ApplicationMetadata,
  bpmnTaskId: string,
  selectedTaskIds: string[],
): ApplicationMetadata => {
  const copied = deepCopy(applicationMetadata);
  applicationMetadata.dataTypes.forEach((dataType: DataTypeElement, i: number) => {
    if (selectedTaskIds.includes(dataType.id)) {
      copied.dataTypes[i].taskId = bpmnTaskId;
    } else {
      copied.dataTypes[i].taskId = null;
    }
  });
  return copied;
};
