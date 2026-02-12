import type { ValidateConfigState } from './ValidateNavigationTypes';

export enum Scope {
  AllTasks = 'allTasks',
  SelectedTasks = 'selectedTasks',
  SelectedPages = 'selectedPages',
}

export const getDefaultConfig = (scope: Scope): ValidateConfigState => ({
  types: [],
  pageScope: '',
  ...(scope === Scope.SelectedTasks && { tasks: [] }),
  ...(scope === Scope.SelectedPages && { task: undefined, pages: [] }),
});

export const getCardLabel = (scope: Scope): string => {
  const cardLabel = {
    [Scope.AllTasks]: 'Velg valideringsregel for alle oppgaver',
    [Scope.SelectedTasks]: 'Velg valideringregel for enkeltoppgaver',
    [Scope.SelectedPages]: 'Velg valideringregel for enkeltsider',
  };
  return cardLabel[scope];
};
