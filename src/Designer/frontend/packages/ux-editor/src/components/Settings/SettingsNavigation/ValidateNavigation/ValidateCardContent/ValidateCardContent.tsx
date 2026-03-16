import React from 'react';
import { type InternalConfigState } from '../utils/ValidateNavigationTypes';
import { ValidateRuleConfig } from './ValidateRuleConfig';
import { PagesSelector, TaskSelector, TasksSelector } from './ValidateTargetSelectors';
import { Scope } from '../utils/ValidateNavigationUtils';

export type ValidateCardContentProps = {
  scope: Scope;
  newConfig: InternalConfigState;
  initialConfig?: InternalConfigState;
  onChange: (updates: Partial<InternalConfigState>) => void;
};

export const ValidateCardContent = ({
  scope,
  initialConfig,
  newConfig,
  onChange,
}: ValidateCardContentProps) => {
  const isPerPage = scope === Scope.SelectedPages;
  const isPerTask = scope === Scope.SelectedTasks;

  return (
    <>
      {isPerTask && (
        <TasksSelector
          selectedTasks={newConfig.tasks}
          initialSelectedTasks={initialConfig?.tasks}
          onChange={(value) => onChange({ tasks: value })}
        />
      )}
      {isPerPage && (
        <>
          <TaskSelector
            selectedTask={newConfig.task}
            initialSelectedTask={initialConfig?.task}
            onChange={(value) => onChange({ task: value, pages: [] })}
          />
          <PagesSelector
            taskName={newConfig.task?.value}
            selectedPages={newConfig.pages}
            onChange={(value) => onChange({ pages: value })}
          />
        </>
      )}
      <ValidateRuleConfig
        selectedTypes={newConfig.types}
        selectedPageScope={newConfig.pageScope}
        onChange={onChange}
      />
    </>
  );
};
