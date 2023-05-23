import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import type { HierarchyDataSources } from 'src/utils/layout/hierarchy.types';

export function getHierarchyDataSourcesMock(): HierarchyDataSources {
  return {
    formData: {},
    applicationSettings: {} as any,
    instanceContext: {} as any,
    hiddenFields: new Set(),
    authContext: null,
    validations: {},
    devTools: getInitialStateMock().devTools,
  };
}
