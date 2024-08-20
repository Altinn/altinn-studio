import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import type { ExpressionDataSources } from 'src/features/expressions/ExprContext';

export function getExpressionDataSourcesMock(): ExpressionDataSources {
  return {
    formDataSelector: () => null,
    formDataRowsSelector: () => [],
    attachmentsSelector: () => {
      throw new Error('Not implemented: attachmentsSelector()');
    },
    layoutSettings: { pages: { order: [] } },
    optionsSelector: () => ({ isFetching: false, options: [] }),
    applicationSettings: getApplicationSettingsMock(),
    instanceDataSources: {} as any,
    authContext: null,
    devToolsIsOpen: false,
    devToolsHiddenComponents: 'hide',
    langToolsSelector: () => staticUseLanguageForTests(),
    currentLanguage: 'nb',
    isHiddenSelector: () => false,
    nodeFormDataSelector: () => ({}) as any,
    nodeDataSelector: () => {
      throw new Error('Not implemented: nodeDataSelector()');
    },
    nodeTraversal: () => {
      throw new Error('Not implemented: nodeTraversal()');
    },
    transposeSelector: () => {
      throw new Error('Not implemented: transposeSelector()');
    },
  };
}
