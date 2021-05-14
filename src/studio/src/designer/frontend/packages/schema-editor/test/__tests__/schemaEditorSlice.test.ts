import reducer, { addField, addProperty, addRootItem, deleteField, deleteProperty, initialState, setFieldValue, setJsonSchema, setKey, setPropertyName, setRef, setSelectedId, setUiSchema, updateJsonSchema } from '../../src/features/editor/schemaEditorSlice';
import { ISchemaState } from '../../src/types';
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
    if (!item || !item.keywords) {
      fail('item not found');
    }
    expect(item.keywords).toContainEqual({ key: 'color', value: 1 });
  });

  it('handles setFieldValue', () => {
    const payload = {
      key: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      value: '666',
    };
    const nextState = reducer(state, setFieldValue(payload));
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kommentar2000Restriksjon');
    if (!item || !item.keywords) {
      fail('item not found');
    }
    const field = item.keywords.find((f) => f.key === 'minLength');
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
      id: '#/definitions/Kontaktperson/properties/navn_endret', name: 'navn_endret', $ref: '#/definitions/NavnSomToken',
    });
  });

  it('handles setRef', () => {
    const payload = {
      ref: '#/definitions/Adresse',
      path: '#/definitions/Kontaktperson/properties/navn',
    };
    const nextState = reducer(state, setRef(payload));
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    if (!item || !item.properties) {
      fail('item not found');
    }
    expect(item.properties).toContainEqual({
      id: '#/definitions/Kontaktperson/properties/navn', name: 'navn', $ref: '#/definitions/Adresse',
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
    if (!item || !item.keywords) {
      fail('item not found');
    }

    expect(item.keywords).not.toContainEqual({ key: 'maxLength' });
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
      newKey: 'test',
      content: [
        {
          id: '#/definitions/test',
        },
      ],
    };
    const nextState = reducer(state, addProperty(payload));

    let item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.properties).toContainEqual({
      $ref: '#/definitions/test', id: '#/definitions/Kontaktperson/properties/test', name: 'test',
    });

    // test add second time to get more case coverage.
    payload.newKey = 'test2';
    payload.content = [{ id: '#/definitions/test2' }];
    const state2 = reducer(nextState, addProperty(payload));
    item = state2.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.properties).toContainEqual({
      $ref: '#/definitions/test2', id: '#/definitions/Kontaktperson/properties/test2', name: 'test2',
    });
  });

  it('handles addField', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      key: 'key',
      value: 'value',
    };
    let nextState = reducer(state, addField(payload));

    let item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.keywords).toContainEqual({
      key: 'key', value: 'value',
    });

    payload.key = 'test';
    payload.value = 'test';
    nextState = reducer(nextState, addField(payload));
    item = nextState.uiSchema.find((f) => f.id === '#/definitions/Kontaktperson');
    expect(item && item.keywords).toContainEqual({
      key: 'test', value: 'test',
    });
  });

  it('handles updateJsonSchema', () => {
    const payload = {
      onSaveSchema: jest.fn(),
    };
    reducer(state, updateJsonSchema(payload));
    expect(payload.onSaveSchema).toBeCalled();
  });

  it('handles addRootItem', () => {
    const payload = {
      itemsToAdd: [
        {
          id: '#/definitions/Foretak',
          properties: [
            {
              id: '#/definitions/Foretak/properties/organisasjonsnummerForetak',
              name: 'organisasjonsnummerForetak',
              $ref: '#/definitions/Organisasjonsnummer',
            },
            {
              id: '#/definitions/Foretak/properties/navnForetak',
              name: 'navnForetak',
              $ref: '#/definitions/Tekst',
            },
            {
              id: '#/definitions/Foretak/properties/adresseForetak',
              name: 'adresseForetak',
              $ref: '#/definitions/Besoeksadresse',
            },
          ],
          name: 'Foretak',
          '@xsdUnhandledAttribute1': 'seres:elementtype=Dataobjekttype',
          '@xsdUnhandledAttribute2': 'seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Foretak/492157',
        },
      ],
    };
    const nextState = reducer(state, addRootItem(payload));
    const item = nextState.uiSchema.find((f) => f.id === '#/definitions/Foretak');
    expect(item).not.toBeUndefined();
    if (item == null) {
      fail('item is null');
    }
    expect(item.properties).toContainEqual({
      id: '#/definitions/Foretak/properties/adresseForetak',
      name: 'adresseForetak',
      $ref: '#/definitions/Besoeksadresse',
    });
  });
});
