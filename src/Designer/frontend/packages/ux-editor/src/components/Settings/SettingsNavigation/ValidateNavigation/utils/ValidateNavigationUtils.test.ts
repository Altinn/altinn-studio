import {
  convertToExternalConfig,
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
