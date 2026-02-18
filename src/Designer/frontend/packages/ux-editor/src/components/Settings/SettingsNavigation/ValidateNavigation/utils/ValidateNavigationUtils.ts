import type { ValidateConfigState } from './ValidateNavigationTypes';
import type { StudioSuggestionItem } from '@studio/components';

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

const toOption = (value: string): StudioSuggestionItem => ({ value, label: value });
const toOptions = (values: string[]): StudioSuggestionItem[] => values.map(toOption);

type ExternalConfigVariant1 = {
  show: string[];
  page: string;
};

type ExternalConfigVariant2 = {
  tasks: string[];
} & ExternalConfigVariant1;

type ExternalConfigVariant3 = {
  task: string;
  pages: string[];
} & ExternalConfigVariant1;

export const convertToInternalConfig = (
  externalConfig: ExternalConfigVariant1 | ExternalConfigVariant2[] | ExternalConfigVariant3[],
): ValidateConfigState | ValidateConfigState[] => {
  const convertSingle = (
    item: ExternalConfigVariant1 | ExternalConfigVariant2 | ExternalConfigVariant3,
  ): ValidateConfigState => {
    const baseConfig: ValidateConfigState = {
      types: toOptions(item.show),
      pageScope: toOption(item.page),
    };

    if ('tasks' in item) {
      return { ...baseConfig, tasks: toOptions(item.tasks) };
    }

    if ('task' in item && 'pages' in item) {
      return { ...baseConfig, task: toOption(item.task), pages: toOptions(item.pages) };
    }

    return baseConfig;
  };

  if (Array.isArray(externalConfig)) {
    return externalConfig.map(convertSingle);
  }

  return convertSingle(externalConfig);
};
