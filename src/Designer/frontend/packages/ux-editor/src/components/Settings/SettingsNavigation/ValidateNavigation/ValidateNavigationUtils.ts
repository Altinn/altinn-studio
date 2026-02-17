import type { ValidateConfigState } from './ValidateNavigationTypes';

export enum Scope {
  AllTasks = 'allTasks',
  SelectedTasks = 'selectedTasks',
  SelectedPages = 'selectedPages',
}

export const getDefaultConfig = (scope: Scope): ValidateConfigState => ({
  types: [],
  pageScope: { value: '', label: '' },
  ...(scope === Scope.SelectedTasks && { tasks: [] }),
  ...(scope === Scope.SelectedPages && { task: undefined, pages: [] }),
});

export const getCardLabel = (scope: Scope): string => {
  const cardLabel = {
    [Scope.AllTasks]: 'ux_editor.settings.navigation_validation_all_tasks_card_label',
    [Scope.SelectedTasks]: 'ux_editor.settings.navigation_validation_specific_tasks_card_label',
    [Scope.SelectedPages]: 'ux_editor.settings.navigation_validation_specific_page_card_label',
  };
  return cardLabel[scope];
};
