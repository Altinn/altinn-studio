import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import type { HierarchyDataSources } from 'src/layout/layout';

export function getHierarchyDataSourcesMock(): HierarchyDataSources {
  return {
    formData: {},
    attachments: {},
    layoutSettings: { pages: { order: [] } },
    pageNavigationConfig: { hidden: [], hiddenExpr: {} },
    options: {},
    applicationSettings: getApplicationSettingsMock(),
    instanceDataSources: {} as any,
    hiddenFields: new Set(),
    authContext: null,
    devToolsIsOpen: false,
    devToolsHiddenComponents: 'hide',
    langToolsRef: { current: staticUseLanguageForTests() },
    currentLanguage: 'nb',
  };
}
