import { renderHookWithProviders } from '../../test/renderHookWithProviders';
import { SchemaState } from '@altinn/schema-editor/types';
import { uiSchemaNodesMock } from '../../test/mocks/uiSchemaMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useSchemaAndReduxSelector } from '@altinn/schema-editor/hooks/useSchemaAndReduxSelector';
import { SchemaAndReduxSelector } from '@altinn/schema-editor/selectors/schemaAndReduxSelectors';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { ReduxSelector } from '@altinn/schema-editor/selectors/reduxSelectors';

// Test data:
const org = 'org';
const app = 'app';
const modelPath = 'modelPath';

describe('useSchemaAndReduxSelector', () => {
  it('Accesses the datamodel and the redux state and returns the result of the selector', () => {
    const selectedEditorTab = 'properties';
    const appContextProps: Partial<SchemaEditorAppContextProps> = { modelPath };
    const queryClient = queryClientMock;
    queryClient.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchemaNodesMock);
    const state: Partial<SchemaState> = { selectedEditorTab };

    const reduxSelector: ReduxSelector<string> = (state) => state?.selectedEditorTab;
    const schemaSelector = (tab, schema) => ({ tab, schema });
    const selector: SchemaAndReduxSelector<string, { tab: string; schema: UiSchemaNodes }> = {
      reduxSelector,
      schemaSelector,
    };

    const { result } = renderHookWithProviders({
      appContextProps,
      queryClient,
      state,
    })(() => useSchemaAndReduxSelector(selector));

    expect(result.current).toEqual({ tab: selectedEditorTab, schema: uiSchemaNodesMock });
  });
});
