import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import type { IInstanceDataSources } from 'src/types/shared';
import type { ExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { NodeFormDataSelector } from 'src/utils/layout/useNodeItem';

export function getExpressionDataSourcesMock(): ExpressionDataSources {
  return {
    formDataSelector: () => null,
    formDataRowsSelector: () => [],
    attachmentsSelector: () => {
      throw new Error('Not implemented: attachmentsSelector()');
    },
    optionsSelector: () => ({ isFetching: false, options: [] }),
    applicationSettings: getApplicationSettingsMock(),
    instanceDataSources: {} as IInstanceDataSources | null,
    langToolsSelector: () => staticUseLanguageForTests(),
    currentLanguage: 'nb',
    isHiddenSelector: () => false,
    nodeFormDataSelector: (() => ({})) as unknown as NodeFormDataSelector,
    nodeDataSelector: () => {
      throw new Error('Not implemented: nodeDataSelector()');
    },
    nodeTraversal: () => {
      throw new Error('Not implemented: nodeTraversal()');
    },
    transposeSelector: () => {
      throw new Error('Not implemented: transposeSelector()');
    },
    externalApis: { data: {}, errors: {} },
  };
}
