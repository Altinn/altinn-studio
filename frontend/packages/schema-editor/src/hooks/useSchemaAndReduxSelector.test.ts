import { renderHookWithProviders } from '../../test/renderHookWithProviders';
import { SchemaState } from '@altinn/schema-editor/types';
import { uiSchemaNodesMock } from '../../test/mocks/uiSchemaMock';
import { useSchemaAndReduxSelector } from '@altinn/schema-editor/hooks/useSchemaAndReduxSelector';
import { SchemaAndReduxSelector } from '@altinn/schema-editor/selectors/schemaAndReduxSelectors';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { ReduxSelector } from '@altinn/schema-editor/selectors/reduxSelectors';

describe('useSchemaAndReduxSelector', () => {
  it('Accesses the datamodel and the redux state and returns the result of the selector', () => {
    const selectedEditorTab = 'properties';
    const appContextProps: Partial<SchemaEditorAppContextProps> = { data: uiSchemaNodesMock, save: jest.fn() };
    const state: Partial<SchemaState> = { selectedEditorTab };

    const reduxSelector: ReduxSelector<string> = (state) => state?.selectedEditorTab;
    const schemaSelector = (tab, schema) => ({ tab, schema });
    const selector: SchemaAndReduxSelector<string, { tab: string; schema: UiSchemaNodes }> = {
      reduxSelector,
      schemaSelector,
    };

    const { result } = renderHookWithProviders({
      appContextProps,
      state,
    })(() => useSchemaAndReduxSelector(selector));

    expect(result.current).toEqual({ tab: selectedEditorTab, schema: uiSchemaNodesMock });
  });
});
