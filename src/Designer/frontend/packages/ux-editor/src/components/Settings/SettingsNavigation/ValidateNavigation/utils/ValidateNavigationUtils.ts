import type {
  ExternalConfigState,
  ExternalConfigWithId,
  InternalConfigState,
} from './ValidateNavigationTypes';
import { properties } from '../../../../../testing/schemas/json/layout/layout-sets.schema.v1.json';
import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';

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

// Temporary dummy data before integration with backend, to be replaced with actual data fetching and saving logic where it is used in upcoming PRs
export const dummyDataTasks: ExternalConfigState[] = [
  {
    show: ['Schema', 'Component'],
    page: 'current',
    tasks: ['form2'],
  },
];

export const dummyDataPages: ExternalConfigState[] = [
  {
    show: ['Schema', 'Component'],
    page: 'current',
    task: 'form',
    pages: ['Side2'],
  },
];
// end of temporary dummy data

export const getAvailableTasks = (
  tasks: LayoutSet[],
  tasksWithRules?: string[],
  selectedTasks?: string[],
): string[] => {
  const taskIds = tasks.flatMap((set) => set.id);

  return taskIds.filter((task) => {
    if (!tasksWithRules) return true;
    return !tasksWithRules.includes(task) || selectedTasks?.includes(task);
  });
};

export const getAvailablePages = (
  formLayouts?: IFormLayouts,
  externalConfig?: ExternalConfigState[],
  selectedPages?: string[],
): string[] => {
  const allPages = formLayouts ? Object.keys(formLayouts) : [];
  const pagesWithRules = externalConfig?.flatMap((config) => config.pages || []) || [];

  return allPages.filter((page) => {
    return !pagesWithRules.includes(page) || selectedPages?.includes(page);
  });
};

type ValidateFormProps = {
  scope: Scope;
  config: InternalConfigState;
  currentConfig: InternalConfigState;
};

export const validateForm = ({ scope, config, currentConfig }: ValidateFormProps): boolean => {
  const noChangesMade = !currentConfig || JSON.stringify(config) === JSON.stringify(currentConfig);
  if (noChangesMade) {
    return false;
  }

  const hasTypes = currentConfig.types?.length > 0;
  const hasPageScope = Boolean(currentConfig.pageScope?.value);

  if (!hasTypes || !hasPageScope) {
    return false;
  }

  switch (scope) {
    case Scope.AllTasks:
      return true;
    case Scope.SelectedTasks:
      return currentConfig.tasks?.length > 0;
    case Scope.SelectedPages:
      return Boolean(currentConfig.task?.value) && currentConfig.pages?.length > 0;
    default:
      return false;
  }
};
