import React from 'react';
import { type InternalConfigState } from '../utils/ValidateNavigationTypes';
import { ValidateRuleConfig } from './ValidateRuleConfig';
import { PagesSelector, TaskSelector, TasksSelector } from './ValidateTargetSelectors';
import { Scope } from '../utils/ValidateNavigationUtils';

export type ValidateCardContentProps = {
  scope: Scope;
  config: InternalConfigState;
  onChange: (updates: Partial<InternalConfigState>) => void;
};

export const ValidateCardContent = ({ scope, config, onChange }: ValidateCardContentProps) => {
  const isPerPage = scope === Scope.SelectedPages;
  const isPerTask = scope === Scope.SelectedTasks;

  return (
    <>
      {isPerTask && (
        <TasksSelector
          selectedTasks={config.tasks}
          onChange={(value) => onChange({ tasks: value })}
        />
      )}
      {isPerPage && (
        <>
          <TaskSelector
            selectedTask={config.task}
            onChange={(value) => onChange({ task: value, pages: [] })}
          />
          <PagesSelector
            taskName={config.task?.value}
            selectedPages={config.pages}
            onChange={(value) => onChange({ pages: value })}
          />
        </>
      )}
      <ValidateRuleConfig
        selectedTypes={config.types}
        selectedPageScope={config.pageScope}
        onChange={onChange}
      />
    </>
  );
};
