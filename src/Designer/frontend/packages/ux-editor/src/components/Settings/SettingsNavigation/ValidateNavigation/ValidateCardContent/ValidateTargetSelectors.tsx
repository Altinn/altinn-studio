import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';

const tasks = ['Oppgave 1', 'Oppgave 2', 'Oppgave 3']; // Temporary mock list of tasks, extract from layout sets on next PR

const renderTaskOptions = () => {
  return tasks.map((task) => (
    <StudioSuggestion.Option key={task} value={task}>
      {task}
    </StudioSuggestion.Option>
  ));
};

export type TaskSelectorProps = {
  selectedTask: StudioSuggestionItem;
  onChange: (value: StudioSuggestionItem) => void;
};

export const TaskSelector = ({ selectedTask, onChange }: TaskSelectorProps) => {
  const { t } = useTranslation();

  return (
    <StudioSuggestion
      selected={selectedTask}
      label={t('ux_editor.settings.navigation_validation_specific_task_label')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_task_no_tasks')}
      onSelectedChange={onChange}
      multiple={false}
    >
      {renderTaskOptions()}
    </StudioSuggestion>
  );
};

export type TasksSelectorProps = {
  selectedTasks: StudioSuggestionItem[];
  onChange: (value: StudioSuggestionItem[]) => void;
};

export const TasksSelector = ({ selectedTasks, onChange }: TasksSelectorProps) => {
  const { t } = useTranslation();
  return (
    <StudioSuggestion
      selected={selectedTasks}
      label={t('ux_editor.settings.navigation_validation_specific_task_label_several')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_task_no_tasks')}
      onSelectedChange={onChange}
      multiple
    >
      {renderTaskOptions()}
    </StudioSuggestion>
  );
};

export type PagesSelectorProps = {
  selectedPages: StudioSuggestionItem[];
  taskName?: string;
  onChange: (value: StudioSuggestionItem[]) => void;
};

export const PagesSelector = ({ selectedPages, taskName, onChange }: PagesSelectorProps) => {
  const { t } = useTranslation();
  const hasSelectedTask = Boolean(taskName);
  const pages = ['Side 1', 'Side 2', 'Side 3']; // Temporary mock list of pages, extract from selected task on next PR

  return (
    <StudioSuggestion
      selected={selectedPages}
      label={t('ux_editor.settings.navigation_validation_specific_page_label')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_page_no_pages')}
      onSelectedChange={onChange}
      multiple
    >
      {hasSelectedTask
        ? pages.map((page) => (
            <StudioSuggestion.Option key={page} value={page}>
              {page}
            </StudioSuggestion.Option>
          ))
        : null}
    </StudioSuggestion>
  );
};
