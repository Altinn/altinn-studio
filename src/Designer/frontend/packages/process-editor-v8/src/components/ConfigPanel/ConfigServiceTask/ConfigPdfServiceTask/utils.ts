import type { Element } from 'bpmn-js/lib/model/Types';
import { generateRandomId } from 'app-shared/utils/generateRandomId';

type AvailableTask = {
  id: string;
  name: string;
};

type PdfConfig = {
  autoPdfTaskIds?: {
    taskIds?: { value: string }[];
  };
  filenameTextResourceKey?: {
    value: string;
  };
};

export const getAvailableTasks = (allTasks: Element[]): AvailableTask[] =>
  allTasks.map((task) => ({
    id: task.id,
    name: task.businessObject?.name || '',
  }));

export const filterCurrentTaskIds = (pdfConfig: PdfConfig, availableTaskIds: string[]): string[] =>
  pdfConfig.autoPdfTaskIds?.taskIds
    ?.filter((taskId) => availableTaskIds.includes(taskId.value))
    .map((taskId) => taskId.value) ?? [];

export const generateTextResourceId = (): string => `pdf-filename-${generateRandomId(8)}`;
