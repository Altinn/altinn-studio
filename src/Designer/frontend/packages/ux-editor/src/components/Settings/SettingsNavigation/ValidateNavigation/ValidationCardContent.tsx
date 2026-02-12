import React from 'react';
import { Scope } from './ValidateNavigation';
import { type StudioSuggestionItem } from '@studio/components';
import { ValidationRuleConfig } from './ValidationRuleConfig';
import { PagesSelector, TasksSelector } from './ValidationTargetSelectors';

export type ValidationConfigState = {
  types: StudioSuggestionItem[];
  pageScope: string;
  tasks?: StudioSuggestionItem[];
  task?: StudioSuggestionItem;
  pages?: StudioSuggestionItem[];
};

type ValidationCardContentProps = {
  scope: Scope;
  config: ValidationConfigState;
  onChange: (updates: Partial<ValidationConfigState>) => void;
};

export const ValidationCardContent = ({ scope, config, onChange }: ValidationCardContentProps) => {
  const isPerPage = scope === Scope.PerPage;
  const isPerTask = scope === Scope.PerTask;

  const handleTaskChange = (value: StudioSuggestionItem | StudioSuggestionItem[]) => {
    if (scope === Scope.PerTask) {
      onChange({ tasks: value as StudioSuggestionItem[] });
    }

    if (scope === Scope.PerPage) {
      onChange({ task: value as StudioSuggestionItem, pages: [] });
    }
  };

  return (
    <>
      {(isPerTask || isPerPage) && (
        <TasksSelector isMultiple={isPerTask} onChange={handleTaskChange} />
      )}
      {isPerPage && (
        <PagesSelector
          taskName={config.task}
          currentPages={config.pages}
          onChange={(value) => onChange({ pages: value })}
        />
      )}
      <ValidationRuleConfig
        types={config.types}
        pageScope={config.pageScope}
        onChange={(value) => onChange(value)}
      />
    </>
  );
};
