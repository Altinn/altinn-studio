import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useFormLayoutsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutsQuery';
import { getAvailablePages, getAvailableTasks } from '../utils/ValidateNavigationUtils';
import { useValidationOnNavigationGroupedSettingsQuery } from '@altinn/ux-editor/hooks/queries/useValidationOnNavigationGroupedSettingsQuery';
import { useValidationOnNavigationPageSettingsQuery } from '@altinn/ux-editor/hooks/queries/usePageValidationOnNavigationLayoutSettingsQuery';

type RenderTaskOptionsProps = {
  tasksWithRules?: string[];
  initialSelectedTasks?: string[];
};

const RenderTaskOptions = ({ tasksWithRules, initialSelectedTasks }: RenderTaskOptionsProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsSchema } = useLayoutSetsQuery(org, app);
  const layoutSets = layoutSetsSchema?.sets || [];
  const availableTasks = getAvailableTasks(layoutSets, tasksWithRules, initialSelectedTasks);

  return availableTasks.map((task) => (
    <StudioSuggestion.Option key={task} value={task}>
      {task}
    </StudioSuggestion.Option>
  ));
};

export type TaskSelectorProps = {
  selectedTask: StudioSuggestionItem;
  initialSelectedTask?: StudioSuggestionItem;
  onChange: (value: StudioSuggestionItem) => void;
};

export const TaskSelector = ({
  selectedTask,
  initialSelectedTask,
  onChange,
}: TaskSelectorProps) => {
  const { t } = useTranslation();
  const initialSelectedTaskValue = initialSelectedTask?.value;

  return (
    <StudioSuggestion
      selected={selectedTask}
      label={t('ux_editor.settings.navigation_validation_specific_task_label')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_task_no_tasks')}
      onSelectedChange={onChange}
      multiple={false}
    >
      <RenderTaskOptions initialSelectedTasks={[initialSelectedTaskValue]} />
    </StudioSuggestion>
  );
};

export type TasksSelectorProps = {
  selectedTasks: StudioSuggestionItem[];
  initialSelectedTasks?: StudioSuggestionItem[];
  onChange: (value: StudioSuggestionItem[]) => void;
};

export const TasksSelector = ({
  selectedTasks,
  initialSelectedTasks,
  onChange,
}: TasksSelectorProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: settings } = useValidationOnNavigationGroupedSettingsQuery(org, app);
  const tasksWithRules = settings?.flatMap((config) => config.tasks) ?? [];
  const selectedTasksValues = selectedTasks.map((task) => task.value);
  const initialSelectedTasksValues = initialSelectedTasks?.map((task) => task.value) || [];
  const filteredTasksWithRules = tasksWithRules.filter(
    (task) => !selectedTasksValues.includes(task),
  );

  return (
    <StudioSuggestion
      selected={selectedTasks}
      label={t('ux_editor.settings.navigation_validation_specific_task_label_several')}
      emptyText={t('ux_editor.settings.navigation_validation_specific_task_no_tasks')}
      onSelectedChange={onChange}
      multiple
    >
      <RenderTaskOptions
        tasksWithRules={filteredTasksWithRules}
        initialSelectedTasks={initialSelectedTasksValues}
      />
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
  const { data: pageValidationData } = useValidationOnNavigationPageSettingsQuery(org, app);

  const configsForTask = (pageValidationData ?? [])
    .filter((config) => config.task === taskName)
    .map((config) => ({
      show: config.show ?? [],
      page: config.page ?? '',
      task: config.task,
      pages: config.pages,
    }));

  const availablePages = getAvailablePages(
    formLayouts,
    configsForTask,
    selectedPages?.map((p) => p.value),
  );

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
