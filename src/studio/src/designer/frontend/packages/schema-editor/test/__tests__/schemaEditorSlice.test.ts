import reducer, { addRestriction, addProperty, deleteField, deleteProperty, initialState, setRestriction, setJsonSchema, setKey, setPropertyName, setRef, setSelectedId, setUiSchema, updateJsonSchema, addEnum, setTitle, setDescription, setType, setRequired, deleteEnum } from '../../src/features/editor/schemaEditorSlice';
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
    const nextState = reducer(state, setRestriction(payload));
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
      id: '#/definitions/Kontaktperson/properties/name', displayName: 'name', type: 'object',
    });
  });

  it('handles addEnum & deleteEnum', () => {
    const payload = {
      path: '#/definitions/StatistiskeEnhetstyper',
      value: 'test',
    };
    let nextState = reducer(state, addEnum(payload));

    let item = nextState.uiSchema.find((f) => f.id === '#/definitions/StatistiskeEnhetstyper');
    expect(item && item.enum).toContainEqual('test');

    nextState = reducer(state, deleteEnum(payload));
    item = nextState.uiSchema.find((f) => f.id === '#/definitions/StatistiskeEnhetstyper');
    expect(item && item.enum).not.toContainEqual('test');
  });

  it('handles addRestriction', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      key: 'key',
      value: '',
    };
    let nextState = reducer(state, addRestriction(payload));

    let item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.restrictions).toContainEqual({
      key: 'key', value: '',
    });

    nextState = reducer(nextState, addRestriction(payload));
    item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.restrictions).toContainEqual({
      key: 'key1', value: '',
    });
  });

  it('handles updateJsonSchema', () => {
    const payload = {
      onSaveSchema: jest.fn(),
    };
    reducer(state, updateJsonSchema(payload));
    expect(payload.onSaveSchema).toBeCalled();
  });

  it('handles setTitle', () => {
    const payload = {
      title: 'test12312',
      path: '#/definitions/Kontaktperson',
    };
    const nextState = reducer(state, setTitle(payload));
    const item: UiSchemaItem | undefined = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item?.title).toBe('test12312');
  });

  it('handles setDescription', () => {
    const payload = {
      description: 'descriptionasdsfsa',
      path: '#/definitions/Kontaktperson',
    };
    const nextState = reducer(state, setDescription(payload));
    const item: UiSchemaItem | undefined = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item?.description).toBe('descriptionasdsfsa');
  });

  it('handles setType', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      value: 'string',
    };
    const nextState = reducer(state, setType(payload));

    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item?.type).toBe('string');
  });

  it('handles setRequired', () => {
    const payload = {
      path: '#/definitions/Kontaktperson/properties/navn',
      key: 'navn',
      required: true,
    };
    let nextState = reducer(state, setRequired(payload));
    let item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.required).toContainEqual('navn');

    payload.required = false;
    nextState = reducer(state, setRequired(payload));
    item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.required).not.toContainEqual('navn');
  });
});
