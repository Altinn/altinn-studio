import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ValidationTypesProps = {
  isMultiple?: boolean;
  onChange: (value: StudioSuggestionItem | StudioSuggestionItem[]) => void;
};

export const TasksSelector = ({ isMultiple = true, onChange }: ValidationTypesProps) => {
  const tasks = ['Oppgave 1', 'Oppgave 2', 'Oppgave 3']; // Temporary mock list of tasks, extract from layout sets on next PR
  const { t } = useTranslation();
  const labelSelector = isMultiple
    ? t('ux_editor.settings.navigation_validation_specific_task_label')
    : t('ux_editor.settings.navigation_validation_specific_task_label_several');

  return (
    <StudioSuggestion
      label={labelSelector}
      emptyText={t('ux_editor.settings.navigation_validation_specific_task_no_tasks')}
      filter={() => true}
      onSelectedChange={onChange}
      multiple={isMultiple}
    >
      {tasks.map((task) => (
        <StudioSuggestion.Option key={task} value={task} label={task}>
          {task}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};

type PagesSelectorProps = {
  currentPages: StudioSuggestionItem[];
  taskName?: StudioSuggestionItem;
  onChange: (value: StudioSuggestionItem[]) => void;
};

export const PagesSelector = ({ currentPages, taskName, onChange }: PagesSelectorProps) => {
  const { t } = useTranslation();
  const hasSelectedTask = Boolean(taskName);
  const pages = ['Side 1', 'Side 2', 'Side 3']; // Temporary mock list of pages, extract from selected task on next PR

  return (
    <StudioSuggestion
      selected={currentPages}
      label={t('ux_editor.settings.navigation_validation_specific_page_header_label')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_page_no_pages')}
      onSelectedChange={onChange}
      multiple
    >
      {hasSelectedTask
        ? pages.map((page) => (
            <StudioSuggestion.Option key={page} value={page} label={page}>
              {page}
            </StudioSuggestion.Option>
          ))
        : null}
    </StudioSuggestion>
  );
};
