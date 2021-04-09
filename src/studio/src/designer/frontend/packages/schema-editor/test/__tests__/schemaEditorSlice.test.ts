import reducer, { initialState, setFieldValue, setJsonSchema, setKey, setUiSchema } from '../../src/features/editor/schemaEditorSlice';
import { ISchemaState } from '../../src/types';
import { dataMock } from '../../src/mockData';

describe('SchemaEditorSlice', () => {
  let state: ISchemaState;
  beforeAll(() => {
    // setup state
    const state1: ISchemaState = reducer(initialState, setJsonSchema({ schema: dataMock }));
    state = reducer(state1, setUiSchema({ rootElementPath: '#/definitions/RA-0678_M' }));
  });
  it('handles setKey action', () => {
    const payload = {
      newKey: 'color',
      oldKey: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
    };
    const nextState = reducer(state, setKey(payload));
    // const item = state.schema.definitions.find((s) => s.id === '#/definitions/Kommentar2000Restriksjon');
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kommentar2000Restriksjon');
    if (!item || !item.fields) {
      fail('item not found');
    }
    expect(item.fields).toContainEqual({ key: 'color', value: 1 });
  });

  it('handles setFieldValue', () => {
    const payload = {
      key: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      value: '666',
    };
    const nextState = reducer(state, setFieldValue(payload));
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kommentar2000Restriksjon');
    if (!item || !item.fields) {
      fail('item not found');
    }
    const field = item.fields.find((f) => f.key === 'minLength');
    if (!field) {
      fail('field not found');
    }
    expect(field.value).toBe('666');
  });
});
