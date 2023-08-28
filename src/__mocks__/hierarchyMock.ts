import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import type { HierarchyDataSources } from 'src/layout/layout';

export function getHierarchyDataSourcesMock(): HierarchyDataSources {
  return {
    formData: {},
    attachments: {},
    uiConfig: {} as any,
    options: {},
    applicationSettings: {} as any,
    instanceContext: {} as any,
    hiddenFields: new Set(),
    authContext: null,
    validations: {},
    devTools: getInitialStateMock().devTools,
    langTools: staticUseLanguageForTests(),
  };
}
