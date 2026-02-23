import type {
  ExternalConfigState,
  ExternalConfigWithId,
  InternalConfigState,
} from './ValidateNavigationTypes';
import { properties } from '../../../../../testing/schemas/json/layout/layout-sets.schema.v1.json';

export enum Scope {
  AllTasks = 'allTasks',
  SelectedTasks = 'selectedTasks',
  SelectedPages = 'selectedPages',
}

export const getDefaultConfig = (scope: Scope): InternalConfigState => ({
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

export enum RuleType {
  Show = 'show',
  Page = 'page',
}

export const getRuleEnums = (ruleType: RuleType) => {
  const { page, show } = properties.validationOnNavigation.properties;
  if (ruleType === RuleType.Page) {
    return page.enum ?? [];
  }

  if (ruleType === RuleType.Show) {
    return show.items.enum ?? [];
  }
  return [];
};

export const convertToExternalConfig = (
  internalConfig: InternalConfigState,
): ExternalConfigState => ({
  show: internalConfig.types.map((type) => type.value),
  page: internalConfig.pageScope.value,
  tasks: internalConfig.tasks?.map((task) => task.value),
  task: internalConfig.task?.value,
  pages: internalConfig.pages?.map((page) => page.value),
});

export const getValuesToDisplay = (config: InternalConfigState) => {
  const values = {
    tasks: config?.tasks?.map((task) => task.label)?.join(', '),
    task: config?.task?.label,
    pages: config?.pages?.map((page) => page.label)?.join(', '),
    types: config?.types?.map((type) => type.label)?.join(', '),
    pageScope: config?.pageScope?.label,
  };

  return Object.fromEntries(Object.entries(values).filter(([, v]) => v != null));
};

export const withUniqueIds = (configs: ExternalConfigState[]): ExternalConfigWithId[] =>
  configs.map((config) => ({ ...config, id: crypto.randomUUID() }));
