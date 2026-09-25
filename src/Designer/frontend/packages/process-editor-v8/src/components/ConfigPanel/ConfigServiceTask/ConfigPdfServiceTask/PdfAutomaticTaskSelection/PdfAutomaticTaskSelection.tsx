import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { StudioModeler } from '../../../../../utils/bpmnModeler/StudioModeler';
import { useUpdatePdfConfigTaskIds } from '../../../../../hooks/useUpdatePdfConfigTaskIds';
import { usePdfConfig } from '../usePdfConfig';
import { filterCurrentTaskIds, getAvailableTasks } from '../utils';

export const PdfAutomaticTaskSelection = (): React.ReactElement => {
  const { t } = useTranslation();
  const updateTaskIds = useUpdatePdfConfigTaskIds();
  const { pdfConfig } = usePdfConfig();

  const studioModeler = new StudioModeler();
  const allTasks = studioModeler.getAllTasksByType('bpmn:Task');
  const availableTasks = getAvailableTasks(allTasks);
  const availableTaskIds = availableTasks.map((task) => task.id);

  const currentTaskIds = filterCurrentTaskIds(pdfConfig, availableTaskIds);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(currentTaskIds);

  const taskLabel = (taskId: string): string => {
    const task = availableTasks.find((availableTask) => availableTask.id === taskId);
    return task ? `${task.name} (${task.id})` : taskId;
  };

  const selectedItems: StudioSuggestionItem[] = selectedTaskIds.map((taskId) => ({
    value: taskId,
    label: taskLabel(taskId),
  }));

  const handleSelectedChange = (items: StudioSuggestionItem[]): void => {
    const newTaskIds = items.map((item) => item.value);
    setSelectedTaskIds(newTaskIds);
    updateTaskIds(newTaskIds);
  };

  return (
    <StudioSuggestion
      multiple
      label={t('process_editor.configuration_panel_select_tasks_placeholder')}
      selected={selectedItems}
      emptyText={t('process_editor.configuration_panel_pdf_no_tasks_to_select')}
      onSelectedChange={handleSelectedChange}
    >
      {availableTasks.map((task) => (
        <StudioSuggestion.Option key={task.id} value={task.id} label={taskLabel(task.id)}>
          {task.name} ({task.id})
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
