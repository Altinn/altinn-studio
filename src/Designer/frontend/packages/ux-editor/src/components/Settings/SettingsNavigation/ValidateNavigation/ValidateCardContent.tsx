import React from 'react';
import { type ValidateConfigState } from './ValidateNavigationTypes';
import { type StudioSuggestionItem } from '@studio/components';
import { ValidateRuleConfig } from './ValidateRuleConfig';
import { PagesSelector, TasksSelector } from './ValidateTargetSelectors';
import { Scope } from './ValidateNavigationUtils';

export type ValidateCardContentProps = {
  scope: Scope;
  config: ValidateConfigState;
  onChange: (updates: Partial<ValidateConfigState>) => void;
};

export const ValidateCardContent = ({ scope, config, onChange }: ValidateCardContentProps) => {
  const isPerPage = scope === Scope.SelectedPages;
  const isPerTask = scope === Scope.SelectedTasks;

  const handleTaskChange = (value: StudioSuggestionItem | StudioSuggestionItem[]) => {
    if (scope === Scope.SelectedTasks) {
      onChange({ tasks: value as StudioSuggestionItem[] });
    }

    if (scope === Scope.SelectedPages) {
      onChange({ task: value as StudioSuggestionItem, pages: [] });
    }
  };

  return (
    <>
      {(isPerTask || isPerPage) && (
        <TasksSelector
          currentTasks={config.tasks}
          isMultiple={isPerTask}
          onChange={handleTaskChange}
        />
      )}
      {isPerPage && (
        <PagesSelector
          taskName={config.task}
          currentPages={config.pages}
          onChange={(value) => onChange({ pages: value })}
        />
      )}
      <ValidateRuleConfig
        types={config.types}
        pageScope={config.pageScope}
        onChange={(value) => onChange(value)}
      />
    </>
  );
};
