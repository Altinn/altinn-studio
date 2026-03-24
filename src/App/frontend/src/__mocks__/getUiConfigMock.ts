import type { GlobalPageSettings, UiConfig } from 'src/features/form/ui/types';
import type { ILayoutSettings } from 'src/layout/common.generated';

export const defaultDataTypeMock = 'test-data-model';
export const statelessDataTypeMock = 'stateless';

export function getGlobalPageSettingsMock(): GlobalPageSettings {
  return {
    hideCloseButton: false,
    showLanguageSelector: false,
    showExpandWidthButton: true,
    expandedWidth: false,
    showProgress: false,
    autoSaveBehavior: 'onChangeFormData',
    taskNavigation: [],
  };
}

export function getLayoutSettingsMock(overrides: Partial<ILayoutSettings>): ILayoutSettings {
  return {
    pages: {
      order: ['page1'],
    },
    ...overrides,
  };
}

export function getUiConfigMock(overrides?: Partial<UiConfig> | ((obj: UiConfig) => void)): UiConfig {
  const out = {
    folders: {
      stateless: getLayoutSettingsMock({ defaultDataType: statelessDataTypeMock }),
      'stateless-anon': getLayoutSettingsMock({ defaultDataType: 'stateless-anon' }),
      Task_1: getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock }),
      'subform-layout': getLayoutSettingsMock({ defaultDataType: 'subform-data' }),
    },
    settings: getGlobalPageSettingsMock(),
    ...(typeof overrides === 'object' ? overrides : undefined),
  };

  if (typeof overrides === 'function') {
    overrides(out);
  }

  return out;
}
