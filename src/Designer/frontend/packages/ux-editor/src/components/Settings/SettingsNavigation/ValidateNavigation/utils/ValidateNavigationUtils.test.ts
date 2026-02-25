import { layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import {
  convertToExternalConfig,
  getAvailablePages,
  getAvailableTasks,
  getCardLabel,
  getDefaultConfig,
  getValuesToDisplay,
  Scope,
} from './ValidateNavigationUtils';

describe('getDefaultConfig', () => {
  it('should return default config for AllTasks scope', () => {
    const config = getDefaultConfig(Scope.AllTasks);
    expect(config).toEqual({
      types: [],
      pageScope: { value: '', label: '' },
    });
  });

  it('should return default config for SelectedTasks scope', () => {
    const config = getDefaultConfig(Scope.SelectedTasks);
    expect(config).toEqual({
      types: [],
      pageScope: { value: '', label: '' },
      tasks: [],
    });
  });

  it('should return default config for SelectedPages scope', () => {
    const config = getDefaultConfig(Scope.SelectedPages);
    expect(config).toEqual({
      types: [],
      pageScope: { value: '', label: '' },
      task: undefined,
      pages: [],
    });
  });
});

describe('getCardLabel', () => {
  it('should return correct label for AllTasks scope', () => {
    const label = getCardLabel(Scope.AllTasks);
    expect(label).toBe('ux_editor.settings.navigation_validation_all_tasks_card_label');
  });

  it('should return correct label for SelectedTasks scope', () => {
    const label = getCardLabel(Scope.SelectedTasks);
    expect(label).toBe('ux_editor.settings.navigation_validation_specific_tasks_card_label');
  });

  it('should return correct label for SelectedPages scope', () => {
    const label = getCardLabel(Scope.SelectedPages);
    expect(label).toBe('ux_editor.settings.navigation_validation_specific_page_card_label');
  });
});

describe('convertToExternalConfig', () => {
  it('should convert internal config to external config correctly', () => {
    const internalConfig = {
      types: [
        { value: 'type1', label: 'Type 1' },
        { value: 'type2', label: 'Type 2' },
      ],
      pageScope: { value: 'current', label: 'Current Page' },
      tasks: [{ value: 'task1', label: 'Task 1' }],
      task: { value: 'task2', label: 'Task 2' },
      pages: [
        { value: 'page1', label: 'Page 1' },
        { value: 'page2', label: 'Page 2' },
      ],
    };
    const externalConfig = convertToExternalConfig(internalConfig);
    expect(externalConfig).toEqual({
      show: ['type1', 'type2'],
      page: 'current',
      tasks: ['task1'],
      task: 'task2',
      pages: ['page1', 'page2'],
    });
  });
});

describe('getValuesToDisplay', () => {
  it('should return correct display values for config', () => {
    const config = {
      types: [
        { value: 'type1', label: 'Type 1' },
        { value: 'type2', label: 'Type 2' },
      ],
      pageScope: { value: 'current', label: 'Current Page' },
      tasks: [{ value: 'task1', label: 'Task 1' }],
      task: { value: 'task2', label: 'Task 2' },
      pages: [
        { value: 'page1', label: 'Page 1' },

        { value: 'page2', label: 'Page 2' },
      ],
    };
    const displayValues = getValuesToDisplay(config);
    expect(displayValues).toEqual({
      tasks: 'Task 1',
      task: 'Task 2',
      pages: 'Page 1, Page 2',
      types: 'Type 1, Type 2',
      pageScope: 'Current Page',
    });
  });
});

describe('getAvailableTasks', () => {
  const tasks = [
    { id: 'task1', name: 'Task 1' },
    { id: 'task2', name: 'Task 2' },
  ];

  it('should return all tasks if no tasksWithRules or selectedTasks provided', () => {
    const availableTasks = getAvailableTasks(tasks);
    expect(availableTasks).toEqual(['task1', 'task2']);
  });

  it('should return only tasks that are not in tasksWithRules unless they are selected', () => {
    const extendedTasks = [...tasks, { id: 'task3', name: 'Task 3' }];
    const tasksWithRules = ['task1', 'task2'];
    const selectedTasks = ['task2'];
    const availableTasks = getAvailableTasks(extendedTasks, tasksWithRules, selectedTasks);
    expect(availableTasks).toEqual(['task2', 'task3']);
  });

  it('should return empty array if all tasks are in tasksWithRules and none are selected', () => {
    const tasksWithRules = ['task1', 'task2'];
    const availableTasks = getAvailableTasks(tasks, tasksWithRules);
    expect(availableTasks).toEqual([]);
  });
});

describe('getAvailablePages', () => {
  const formLayouts = {
    page1: layoutMock,
    page2: layoutMock,
  };

  const externalConfig = [
    {
      pages: ['page1'],
      show: ['Schema'],
      page: 'current',
    },
  ];

  it('should return all pages if no externalConfig', () => {
    const availablePages = getAvailablePages(formLayouts);
    expect(availablePages).toEqual(['page1', 'page2']);
  });

  it('should return only pages that are not in externalConfig unless they are selected', () => {
    const selectedPages = ['page2'];
    const availablePages = getAvailablePages(formLayouts, externalConfig, selectedPages);
    expect(availablePages).toEqual(['page2']);
  });

  it('should return empty array if all pages are in externalConfig and none are selected', () => {
    const externalConfigAllPages = [
      ...externalConfig,
      {
        pages: ['page2'],
        show: ['Schema'],
        page: 'current',
      },
    ];

    const availablePages = getAvailablePages(formLayouts, externalConfigAllPages);
    expect(availablePages).toEqual([]);
  });
});
