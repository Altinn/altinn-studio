import { processLayoutSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { defaultGlobalUiSettings } from 'src/features/form/ui';
import { NavigationReceipt, NavigationTask } from 'src/features/form/ui/types';
import type { ILayoutSettings, NavigationPageGroup } from 'src/layout/common.generated';

describe('processLayoutSettings', () => {
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

  function process({
    order,
    groups,
    taskNavigation,
    overrideTaskNavigation,
  }: {
    order?: string[];
    groups?: Omit<NavigationPageGroup, 'id'>[];
    taskNavigation?: (Omit<NavigationTask, 'id'> | Omit<NavigationReceipt, 'id'>)[];
    overrideTaskNavigation?: (Omit<NavigationTask, 'id'> | Omit<NavigationReceipt, 'id'>)[];
  }) {
    window.altinnAppGlobalData.ui.settings = {
      ...defaultGlobalUiSettings,
      taskNavigation:
        (taskNavigation as (NavigationTask | NavigationReceipt)[]) ?? defaultGlobalUiSettings.taskNavigation,
    };

    const settings: ILayoutSettings = {
      pages: {
        ...(order && { order }),
        ...(groups && { groups }),
        ...(overrideTaskNavigation && { taskNavigation: overrideTaskNavigation }),
      },
    } as ILayoutSettings;

    return processLayoutSettings(settings);
  }

  describe('order', () => {
    it('returns regular page order', () => {
      const result = process({ order: ['first', 'second', 'third', 'fourth'] });
      expect(result.order).toEqual(['first', 'second', 'third', 'fourth']);
    });

    it('returns page order inferred from grouped navigation', () => {
      const result = process({
        groups: [
          { order: ['first'], type: 'info' },
          { order: ['second', 'third'], markWhenCompleted: true },
          { order: ['fourth'] },
        ],
      });
      expect(result.order).toEqual(['first', 'second', 'third', 'fourth']);
    });
  });

  describe('groups', () => {
    it('should return undefined when using regular order', () => {
      const result = process({ order: ['first', 'second', 'third', 'fourth'] });
      expect(result.groups).toBeUndefined();
    });

    it('should generate a unique id', () => {
      const result = process({
        groups: [
          { order: ['first'], type: 'info' },
          { order: ['second', 'third'], markWhenCompleted: true },
          { order: ['fourth'] },
        ],
      });
      expect(result.groups).toHaveLength(3);
      expect(result.groups![0].id).toMatch(UUID);
      expect(result.groups![0].order).toEqual(['first']);
      expect(result.groups![1].id).toMatch(UUID);
      expect(result.groups![1].order).toEqual(['second', 'third']);
      expect(result.groups![2].id).toMatch(UUID);
      expect(result.groups![2].order).toEqual(['fourth']);
    });
  });

  describe('pageSettings.taskNavigation', () => {
    it('returns empty array when not specified', () => {
      const result = process({ order: ['first'] });
      expect(result.pageSettings.taskNavigation).toEqual([]);
    });

    it('returns value from layout-sets', () => {
      const result = process({
        order: ['first'],
        taskNavigation: [
          { taskId: 'task1', name: 'utfylling' },
          { type: 'receipt', name: 'kvittering' },
        ],
      });
      expect(result.pageSettings.taskNavigation).toHaveLength(2);
      expect(result.pageSettings.taskNavigation[0].name).toBe('utfylling');
      expect(result.pageSettings.taskNavigation[1].name).toBe('kvittering');
    });

    it('returns value from settings when overridden', () => {
      const result = process({
        order: ['first'],
        taskNavigation: [
          { taskId: 'task1', name: 'utfylling' },
          { type: 'receipt', name: 'kvittering' },
        ],
        overrideTaskNavigation: [{ taskId: 'task1', name: 'personopplysninger' }],
      });
      expect(result.pageSettings.taskNavigation).toHaveLength(1);
      expect(result.pageSettings.taskNavigation[0].id).toMatch(UUID);
      expect(result.pageSettings.taskNavigation[0].name).toBe('personopplysninger');
    });
  });

  describe('autoSaveBehavior', () => {
    function processWithPages(pages: Record<string, unknown>) {
      window.altinnAppGlobalData.ui.settings = { ...defaultGlobalUiSettings };
      return processLayoutSettings({ pages: { order: ['first'], ...pages } } as ILayoutSettings);
    }

    // 'onChangeFormData' is deliberately the value under test throughout: the runtime
    // default is 'onChangePage', so asserting that would pass even if the setting were
    // ignored entirely.
    it('reads the current spelling', () => {
      const result = processWithPages({ autoSaveBehavior: 'onChangeFormData' });
      expect(result.pageSettings.autoSaveBehavior).toBe('onChangeFormData');
    });

    // Altinn Studio Designer wrote the British spelling into Settings.json until v9,
    // while the app only ever read the American one — so the setting silently did
    // nothing. It is read as a fallback until `studioctl app upgrade` rewrites the file.
    it('falls back to the deprecated British spelling', () => {
      const result = processWithPages({ autoSaveBehaviour: 'onChangeFormData' });
      expect(result.pageSettings.autoSaveBehavior).toBe('onChangeFormData');
    });

    it('uses the default when neither spelling is present', () => {
      const result = processWithPages({});
      expect(result.pageSettings.autoSaveBehavior).toBe(defaultGlobalUiSettings.autoSaveBehavior);
    });

    it('prefers the current spelling when both are present', () => {
      const result = processWithPages({
        autoSaveBehavior: 'onChangeFormData',
        autoSaveBehaviour: 'onChangePage',
      });
      expect(result.pageSettings.autoSaveBehavior).toBe('onChangeFormData');
    });
  });
});
