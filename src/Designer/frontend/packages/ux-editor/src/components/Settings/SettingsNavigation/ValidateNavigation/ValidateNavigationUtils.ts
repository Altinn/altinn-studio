import { Scope } from './ValidateNavigation';
import type { ValidationConfigState } from './ValidationCardContent';

export const getDefaultConfig = (scope: Scope): ValidationConfigState => ({
  types: [],
  pageScope: '',
  ...(scope === Scope.PerTask && { tasks: [] }),
  ...(scope === Scope.PerPage && { task: undefined, pages: [] }),
});

export const getCardLabel = (scope: Scope): string => {
  const cardLabel = {
    [Scope.AllTasks]: 'Velg valideringsregel for alle oppgaver',
    [Scope.PerTask]: 'Velg valideringregel for enkeltoppgaver',
    [Scope.PerPage]: 'Velg valideringregel for enkeltsider',
  };
  return cardLabel[scope];
};
