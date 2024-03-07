import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const reservedDataTypes = {
  includeAll: 'include-all',
  currentTask: 'current-task',
  refDataAsPdf: 'ref-data-as-pdf',
};

export const dataExternalFormat = (
  selectedDataTypes: string[],
  availableAttachments: string[],
): string[] => {
  const selectedAttachments = selectedDataTypes.filter(
    (dataType) => !Object.values(reservedDataTypes).includes(dataType),
  );

  const includeAllAttachments = selectedAttachments.length === availableAttachments.length;

  if (!includeAllAttachments) {
    return selectedDataTypes;
  }

  const includeCurrentTask = selectedDataTypes.includes(reservedDataTypes.currentTask);
  const includePdf = selectedDataTypes.includes(reservedDataTypes.refDataAsPdf);

  return allDataExternalFormat(includePdf, includeCurrentTask);
};

const allDataExternalFormat = (includePdf: boolean, onlyCurrentTask: boolean): string[] => {
  const allAttachments: string[] = includePdf ? [reservedDataTypes.includeAll] : [];

  if (onlyCurrentTask) {
    allAttachments.push(reservedDataTypes.currentTask);
  }
  return allAttachments;
};

export const dataInternalFormat = (
  tasks: string[],
  availableDataTypes: Partial<ApplicationMetadata['dataTypes']>,
  dataTypeIds: string[],
) => {
  const availableAttachments = getAvailableAttachments(tasks, availableDataTypes);
  const selectedDataTypes = getSelectedDataTypes(dataTypeIds, availableAttachments);

  return {
    availableAttachments,
    selectedDataTypes,
  };
};

const getAvailableAttachments = (
  tasks: string[],
  availableDataTypes: Partial<ApplicationMetadata['dataTypes']>,
): string[] => {
  const filteredAttachments = availableDataTypes.filter(
    (dataType) =>
      !Object.values(reservedDataTypes).includes(dataType.id) &&
      !dataType.appLogic &&
      tasks.some((task) => dataType.taskId === task),
  );
  const mappedAttachments = filteredAttachments?.map((dataType) => dataType.id);
  const sortedAttachments = mappedAttachments.sort((a, b) => a.localeCompare(b));

  return sortedAttachments;
};

const getSelectedDataTypes = (dataTypeIds: string[], attachments: string[]): string[] => {
  const dataTypeIdsWithoutReserved = dataTypeIds.filter(
    (dataType) => !Object.values(reservedDataTypes).includes(dataType),
  );
  const includeCurrentTask = dataTypeIds.includes(reservedDataTypes.currentTask);
  const includeAllAttachments =
    dataTypeIds.includes(reservedDataTypes.includeAll) ||
    dataTypeIdsWithoutReserved.length === attachments.length ||
    dataTypeIds.length === 0 ||
    (includeCurrentTask && dataTypeIds.length === 1);

  if (!includeAllAttachments) {
    return dataTypeIds;
  }

  const includePdf =
    dataTypeIds.includes(reservedDataTypes.refDataAsPdf) ||
    dataTypeIds.includes(reservedDataTypes.includeAll);

  const selectedDataTypes = attachments.slice();
  if (includePdf) {
    selectedDataTypes.push(reservedDataTypes.refDataAsPdf);
  }
  if (includeCurrentTask) {
    selectedDataTypes.push(reservedDataTypes.currentTask);
  }

  return selectedDataTypes;
};

export const getTasks = (
  layoutSets: LayoutSets,
  selectedLayoutSet: string,
  onlyCurrentTask: boolean,
): string[] => {
  return onlyCurrentTask
    ? currentTasks(layoutSets, selectedLayoutSet)
    : sampleTasks(layoutSets, selectedLayoutSet);
};

const currentTasks = (layoutSets: LayoutSets, selectedLayoutSet: string): string[] =>
  layoutSets.sets.find((layoutSet) => layoutSet.id === selectedLayoutSet).tasks;

const sampleTasks = (layoutSets: LayoutSets, selectedLayoutSet: string): string[] => {
  const tasks = [];
  for (const layoutSet of layoutSets.sets) {
    tasks.push(...layoutSet.tasks);
    if (layoutSet.id === selectedLayoutSet) {
      break;
    }
  }
  return tasks;
};

export const validateSelection = (selectedDataTypes: string[]): boolean => {
  return (
    selectedDataTypes.length > 0 ||
    (selectedDataTypes.length === 1 && !selectedDataTypes.includes(reservedDataTypes.currentTask))
  );
};
