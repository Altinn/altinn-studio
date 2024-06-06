import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import type { HierarchyDataSources } from 'src/layout/layout';

export function getHierarchyDataSourcesMock(): HierarchyDataSources {
  return {
    formDataSelector: () => null,
    attachments: {},
    layoutSettings: { pages: { order: [] } },
    pageNavigationConfig: { isHiddenPage: () => false, hiddenExpr: {} },
    options: () => [],
    applicationSettings: getApplicationSettingsMock(),
    instanceDataSources: {} as any,
    isHidden: () => false,
    authContext: null,
    devToolsIsOpen: false,
    devToolsHiddenComponents: 'hide',
    langToolsSelector: () => staticUseLanguageForTests(),
    currentLanguage: 'nb',
  };
}
