import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useFormLayoutsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutsQuery';
import {
  dummyDataPages,
  dummyDataTasks,
  getAvailablePages,
  getAvailableTasks,
} from '../utils/ValidateNavigationUtils';

type RenderTaskOptionsProps = {
  tasksWithRules?: string[];
  selectedTasks?: string[];
};

const RenderTaskOptions = ({ tasksWithRules, selectedTasks }: RenderTaskOptionsProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsSchema } = useLayoutSetsQuery(org, app);
  const layoutSets = layoutSetsSchema?.sets || [];
  const availableTasks = getAvailableTasks(layoutSets, tasksWithRules, selectedTasks);

  return availableTasks.map((task) => (
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
      <RenderTaskOptions />
    </StudioSuggestion>
  );
};

export type TasksSelectorProps = {
  selectedTasks: StudioSuggestionItem[];
  onChange: (value: StudioSuggestionItem[]) => void;
};

export const TasksSelector = ({ selectedTasks, onChange }: TasksSelectorProps) => {
  const { t } = useTranslation();
  const tasksWithRules = dummyDataTasks.map((config) => config.tasks).flat(); // this will be replaced with fetched query data in real implementation
  const selectedTasksValues = selectedTasks.map((task) => task.value);

  return (
    <StudioSuggestion
      selected={selectedTasks}
      label={t('ux_editor.settings.navigation_validation_specific_task_label_several')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_task_no_tasks')}
      onSelectedChange={onChange}
      multiple
    >
      <RenderTaskOptions tasksWithRules={tasksWithRules} selectedTasks={selectedTasksValues} />
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
  const { org, app } = useStudioEnvironmentParams();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, taskName);
  const availablePages = getAvailablePages(
    formLayouts,
    dummyDataPages,
    selectedPages?.map((p) => p.value),
  ); // dummyDataPages is just to simulate the rules that are already set, in real implementation this will be replaced with fetched query data

  const noAvailablePages = taskName && availablePages.length === 0;
  const emptyText = noAvailablePages
    ? t('ux_editor.settings.navigation_validation_specific_page_no_pages_available')
    : t('ux_editor.settings.navigation_validation_specific_page_no_task_selected');

  return (
    <StudioSuggestion
      selected={selectedPages}
      label={t('ux_editor.settings.navigation_validation_specific_page_label')}
      emptyText={emptyText}
      onSelectedChange={onChange}
      multiple
    >
      {availablePages?.map((page) => (
        <StudioSuggestion.Option key={page} value={page}>
          {page}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
