import { getCardLabel, getDefaultConfig, Scope } from './ValidateNavigationUtils';

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
