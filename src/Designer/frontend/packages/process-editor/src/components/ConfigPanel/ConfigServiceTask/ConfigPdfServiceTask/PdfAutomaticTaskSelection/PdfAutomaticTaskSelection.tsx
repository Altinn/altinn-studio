import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { StudioModeler } from '../../../../../utils/bpmnModeler/StudioModeler';
import { usePdfConfig } from '../usePdfConfig';
import { filterCurrentTaskIds, getAvailableTasks } from '../utils';
import { BpmnTypeEnum } from '../../../../../enum/BpmnTypeEnum';

export const PdfAutomaticTaskSelection = (): React.ReactElement => {
  const { t } = useTranslation();
  const { pdfConfig, updateTaskIds } = usePdfConfig();

  const studioModeler = new StudioModeler();
  const allTasks = studioModeler.getElementsByType(BpmnTypeEnum.Task);
  const availableTasks = getAvailableTasks(allTasks);
  const availableTaskIds = availableTasks.map((task) => task.id);

  const selectedTaskIds = filterCurrentTaskIds(pdfConfig, availableTaskIds);

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
