import reducer, { addField, addProperty, deleteField, deleteProperty, initialState, setFieldValue, setJsonSchema, setKey, setPropertyName, setRef, setSelectedId, setUiSchema, updateJsonSchema } from '../../src/features/editor/schemaEditorSlice';
import { ISchemaState, UiSchemaItem } from '../../src/types';
import { dataMock } from '../../src/mockData';

describe('SchemaEditorSlice', () => {
  let state: ISchemaState;
  beforeEach(() => {
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
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kommentar2000Restriksjon');
    if (!item || !item.restrictions) {
      fail('item not found');
    }
    expect(item.restrictions).toContainEqual({ key: 'color', value: 1 });
  });

  it('handles setFieldValue', () => {
    const payload = {
      key: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      value: '666',
    };
    const nextState = reducer(state, setFieldValue(payload));
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kommentar2000Restriksjon');
    if (!item || !item.restrictions) {
      fail('item not found');
    }
    const field = item.restrictions.find((f) => f.key === 'minLength');
    if (!field) {
      fail('field not found');
    }
    expect(field.value).toBe('666');
  });

  it('handles setPropertyName', () => {
    const payload = {
      name: 'navn_endret',
      path: '#/definitions/Kontaktperson/properties/navn',
    };
    const nextState = reducer(state, setPropertyName(payload));
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    if (!item || !item.properties) {
      fail('item not found');
    }
    expect(item.properties).toContainEqual({
      id: '#/definitions/Kontaktperson/properties/navn_endret', displayName: 'navn_endret', $ref: '#/definitions/NavnSomToken',
    });
  });

  it('handles setRef', () => {
    const payload = {
      ref: '#/definitions/Adresse',
      path: '#/definitions/Kontaktperson/properties/navn',
    };
    const nextState = reducer(state, setRef(payload));
    const item: UiSchemaItem | undefined = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    if (!item || !item.properties) {
      fail('item not found');
    }
    expect(item.properties).toContainEqual({
      id: '#/definitions/Kontaktperson/properties/navn', displayName: 'navn', $ref: '#/definitions/Adresse',
    });
  });

  it('handles setSelectedId', () => {
    const payload = {
      id: '#/definitions/Kommentar2000Restriksjon',
    };
    const nextState = reducer(state, setSelectedId(payload));
    expect(nextState.selectedId).toEqual('#/definitions/Kommentar2000Restriksjon');
  });
  it('handles deleteField', () => {
    const payload = {
      path: '#/definitions/Kommentar2000Restriksjon',
      key: 'maxLength',
    };
    const nextState = reducer(state, deleteField(payload));

    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kommentar2000Restriksjon');
    if (!item || !item.restrictions) {
      fail('item not found');
    }

    expect(item.restrictions).not.toContainEqual({ key: 'maxLength' });
  });

  it('handles deleteProperty', () => {
    const payload = {
      path: '#/definitions/Kontaktperson/properties/navn',
    };
    const nextState = reducer(state, deleteProperty(payload));

    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    if (!item || !item.properties) {
      fail('item not found');
    }

    expect(item.properties).not.toContainEqual({ id: '#/definitions/Kontaktperson/properties/navn' });
  });

  it('handles deleteProperty (root definition)', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
    };
    const nextState = reducer(state, deleteProperty(payload));

    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item).toBeUndefined();
  });

  it('handles addProperty', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
    };
    const nextState = reducer(state, addProperty(payload));

    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.properties).toContainEqual({
      id: '#/definitions/Kontaktperson/properties/name', displayName: 'name', restrictions: [{ key: 'type', value: 'object' }],
    });

    // test add second time to get more case coverage.
    // const state2 = reducer(nextState, addProperty(payload));
    // item = state2.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    // expect(item && item.properties).toContainEqual({
    //   id: '#/definitions/Kontaktperson/properties/navn', name: 'test2',
    // });
  });

  it('handles addField', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      key: 'key',
      value: '',
    };
    let nextState = reducer(state, addField(payload));

    let item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.restrictions).toContainEqual({
      key: 'key', value: '',
    });

    payload.key = 'test';
    payload.value = '';
    nextState = reducer(nextState, addField(payload));
    item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.restrictions).toContainEqual({
      key: 'test', value: '',
    });
  });

  it('handles updateJsonSchema', () => {
    const payload = {
      onSaveSchema: jest.fn(),
    };
    reducer(state, updateJsonSchema(payload));
    expect(payload.onSaveSchema).toBeCalled();
  });
});
