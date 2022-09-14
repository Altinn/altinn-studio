import {
  addCombinationItem,
  addEnum,
  addProperty,
  addRestriction,
  addRootItem,
  deleteCombinationItem,
  deleteEnum,
  deleteField,
  deleteProperty,
  initialState,
  navigateToType,
  promoteProperty,
  reducer,
  setCombinationType,
  setDescription,
  setItems,
  setJsonSchema,
  setPropertyName,
  setRef,
  setRequired,
  setRestriction,
  setRestrictionKey,
  setSelectedId,
  setSelectedTab,
  setTitle,
  setType,
  setUiSchema,
  updateJsonSchema,
} from './schemaEditorSlice';
import {
  CombinationKind,
  FieldType,
  ISchemaState,
  UiSchemaItem,
} from '../../types';
import { dataMock } from '../../mockData';
import { getUiSchemaItem, resetUniqueNumber } from '../../utils/schema';

describe('SchemaEditorSlice', () => {
  let state: ISchemaState;

  beforeEach(() => {
    // setup state
    const state1: ISchemaState = reducer(
      initialState,
      setJsonSchema({ schema: dataMock }),
    );
    state = reducer(state1, setUiSchema({ name: '#/definitions/RA-0678_M' }));
    resetUniqueNumber();
  });

  it('handles setRestrictionKey', () => {
    const payload = {
      newKey: 'color',
      oldKey: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
    };
    let nextState = reducer(state, setRestrictionKey(payload));
    let item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kommentar2000Restriksjon',
    );
    if (!item || !item.restrictions) {
      fail('item not found');
    }
    expect(item.restrictions).toContainEqual({ key: 'color', value: 1 });
    payload.oldKey = 'maxLength';
    nextState = reducer(nextState, setRestrictionKey(payload));
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kommentar2000Restriksjon',
    );
    expect(item && item.restrictions).toContainEqual({
      key: 'color0',
      value: 2000,
    });

    payload.oldKey = 'color';
    nextState = reducer(nextState, setRestrictionKey(payload));
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kommentar2000Restriksjon',
    );
    expect(item && item.restrictions && item.restrictions.length).toBe(4);
  });

  it('handles setFieldValue', () => {
    const payload = {
      key: 'minLength',
      path: '#/definitions/Kommentar2000Restriksjon',
      value: '666',
    };
    const nextState = reducer(state, setRestriction(payload));
    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kommentar2000Restriksjon',
    );
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
    let nextState = reducer(state, setPropertyName(payload));
    let item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    if (!item || !item.properties) {
      fail('item not found');
    }
    expect(item.properties).toContainEqual({
      path: '#/definitions/Kontaktperson/properties/navn_endret',
      displayName: 'navn_endret',
      $ref: '#/definitions/NavnSomToken',
    });

    // test that child paths are also updated
    payload.path = '#/definitions/Kontaktperson';
    payload.name = 'batman';
    nextState = reducer(nextState, setPropertyName(payload));
    item = nextState.uiSchema.find((f) => f.path === '#/definitions/batman');
    expect(item && item.properties).toContainEqual({
      path: '#/definitions/batman/properties/navn_endret',
      displayName: 'navn_endret',
      $ref: '#/definitions/NavnSomToken',
    });
  });

  it('renames combination and children when renaming a combination', () => {
    const anyOfItem = state.uiSchema.find(
      (f) => f.path === '#/definitions/anyOfTestSeveralItems',
    );
    expect(anyOfItem?.combination?.[1].path).toBe(
      '#/definitions/anyOfTestSeveralItems/anyOf/1',
    );

    const nextState = reducer(
      state,
      setPropertyName({
        path: '#/definitions/anyOfTestSeveralItems',
        name: 'tullballeee',
      }),
    );
    const updatedAnyOfItem = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/tullballeee',
    );
    expect(updatedAnyOfItem?.combination?.[1].path).toBe(
      '#/definitions/tullballeee/anyOf/1',
    );
  });

  it('handles setRef', () => {
    const payload = {
      ref: '#/definitions/Adresse',
      path: '#/definitions/Kontaktperson/properties/navn',
    };
    const nextState = reducer(state, setRef(payload));
    const item: UiSchemaItem | undefined = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    if (!item || !item.properties) {
      fail('item not found');
    }
    expect(item.properties).toContainEqual({
      path: '#/definitions/Kontaktperson/properties/navn',
      displayName: 'navn',
      $ref: '#/definitions/Adresse',
    });
  });

  it('handles setSelectedId', () => {
    const payload = {
      id: '#/definitions/Kommentar2000Restriksjon',
    };
    const nextState = reducer(
      { ...state, selectedEditorTab: 'definitions' },
      setSelectedId(payload),
    );
    expect(nextState.selectedDefinitionNodeId).toEqual(
      '#/definitions/Kommentar2000Restriksjon',
    );
  });

  it('handles setSelectedId by properties tab', () => {
    const payload = {
      id: '#/properties/someField',
    };
    const nextState = reducer(
      { ...state, selectedEditorTab: 'properties' },
      setSelectedId(payload),
    );
    expect(nextState.selectedPropertyNodeId).toEqual('#/properties/someField');
  });

  it('handles navigateToType', () => {
    const payload = {
      id: '#/definitions/someField',
    };
    const nextState = reducer(
      { ...state, selectedEditorTab: 'properties' },
      navigateToType(payload),
    );
    expect(nextState.selectedEditorTab).toEqual('definitions');
    expect(nextState.selectedDefinitionNodeId).toEqual(
      '#/definitions/someField',
    );
  });

  it('handles setSelectedTab', () => {
    const payload: { selectedTab: 'definitions' | 'properties' } = {
      selectedTab: 'definitions',
    };
    const nextState = reducer(
      { ...state, selectedEditorTab: 'properties' },
      setSelectedTab(payload),
    );
    expect(nextState.selectedEditorTab).toEqual('definitions');
  });

  it('handles deleteField', () => {
    const payload = {
      path: '#/definitions/Kommentar2000Restriksjon',
      key: 'maxLength',
    };
    const nextState = reducer(state, deleteField(payload));

    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kommentar2000Restriksjon',
    );
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

    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    if (!item || !item.properties) {
      fail('item not found');
    }

    expect(item.properties).not.toContainEqual({
      path: '#/definitions/Kontaktperson/properties/navn',
    });
  });

  it('resets selected id when deleting selected definition', () => {
    const payload = {
      path: '#/definitions/someField',
    };
    const mockState = {
      ...state,
      selectedEditorTab: 'definitions',
      selectedDefinitionNodeId: '#/definitions/someField',
    } as ISchemaState;
    const nextState = reducer(mockState, deleteProperty(payload));
    expect(nextState.selectedDefinitionNodeId).toEqual('');
  });

  it('resets selected id when deleting selected property', () => {
    const payload = {
      path: '#/properties/someField',
    };
    const mockState = {
      ...state,
      selectedEditorTab: 'properties',
      selectedPropertyNodeId: '#/properties/someField',
    } as ISchemaState;
    const nextState = reducer(mockState, deleteProperty(payload));
    expect(nextState.selectedPropertyNodeId).toEqual('');
  });

  it('handles deleteProperty (root definition)', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
    };
    const nextState = reducer(state, deleteProperty(payload));

    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item).toBeUndefined();
  });

  it('handles addProperty', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      props: {
        type: FieldType.Object,
      } as Partial<UiSchemaItem>,
    };
    const nextState = reducer(state, addProperty(payload));

    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item && item.properties).toContainEqual({
      path: '#/definitions/Kontaktperson/properties/name',
      displayName: 'name',
      type: FieldType.Object,
    });
  });

  it('handles addRootItem', () => {
    const payload = {
      name: 'superman',
      location: 'definitions',
      props: {
        type: FieldType.Object,
      } as Partial<UiSchemaItem>,
    };
    let nextState = reducer(state, addRootItem(payload));
    expect(nextState.uiSchema).toContainEqual({
      path: '#/definitions/superman',
      displayName: 'superman',
      type: FieldType.Object,
    });
    nextState = reducer(nextState, addRootItem(payload));
    expect(nextState.uiSchema).toContainEqual({
      path: '#/definitions/superman0',
      displayName: 'superman0',
      type: FieldType.Object,
    });
    expect(nextState.selectedDefinitionNodeId).toBe('#/definitions/superman0');
  });

  it('handles addEnum & deleteEnum', () => {
    const payload = {
      path: '#/definitions/StatistiskeEnhetstyper',
      value: 'test',
      oldValue: '',
    };

    // add
    let nextState = reducer(state, addEnum(payload));
    let item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/StatistiskeEnhetstyper',
    );
    expect(item && item.enum).toContainEqual('test');
    // rename
    payload.oldValue = 'test';
    payload.value = 'test2';
    nextState = reducer(nextState, addEnum(payload));
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/StatistiskeEnhetstyper',
    );
    expect(item && item.enum).not.toContainEqual('test');
    expect(item && item.enum).toContainEqual('test2');
    // delete
    nextState = reducer(nextState, deleteEnum(payload));
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/StatistiskeEnhetstyper',
    );
    expect(item && item.enum).not.toContainEqual('test2');
  });

  it('handles addRestriction', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      key: 'key',
      value: '',
    };
    let nextState = reducer(state, addRestriction(payload));

    let item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item && item.restrictions).toContainEqual({
      key: 'key',
      value: '',
    });

    nextState = reducer(nextState, addRestriction(payload));
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item && item.restrictions).toContainEqual({
      key: 'key0',
      value: '',
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
    const item: UiSchemaItem | undefined = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item?.title).toBe('test12312');
  });

  it('handles setDescription', () => {
    const payload = {
      description: 'descriptionasdsfsa',
      path: '#/definitions/Kontaktperson',
    };
    const nextState = reducer(state, setDescription(payload));
    const item: UiSchemaItem | undefined = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item?.description).toBe('descriptionasdsfsa');
  });

  it('handles setType', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      type: 'string' as FieldType,
    };
    const nextState = reducer(state, setType(payload));

    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item?.type).toBe('string');
  });

  it('handles setItems', () => {
    const payload = {
      path: '#/definitions/Kontaktperson',
      items: { type: 'string' },
    };
    const nextState = reducer(state, setItems(payload));

    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item?.items?.type).toBe('string');
  });

  it('handles setRequired', () => {
    const payload = {
      path: '#/definitions/Kontaktperson/properties/navn',
      key: 'navn',
      required: true,
    };
    let nextState = reducer(state, setRequired(payload));
    let item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item && item.required).toContainEqual('navn');

    payload.required = false;
    nextState = reducer(state, setRequired(payload));
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/Kontaktperson',
    );
    expect(item && item.required).not.toContainEqual('navn');
  });

  it('handles promotion of root-level types', () => {
    const schema = {
      properties: {
        melding: {
          properties: {
            name: {
              type: 'string',
            },
          },
        },
      },
      definitions: {},
    };
    let nextState = reducer(state, setJsonSchema({ schema }));
    nextState = reducer(nextState, setUiSchema({ name: 'test' }));

    const prop = getUiSchemaItem(
      nextState.uiSchema,
      '#/properties/melding/properties/name',
    );
    getUiSchemaItem(nextState.uiSchema, '#/properties/melding/properties/name');
    expect(prop && prop.type).toBe('string');

    const payload = {
      path: '#/properties/melding/properties/name',
    };
    nextState = reducer(nextState, promoteProperty(payload));
    const ref = getUiSchemaItem(
      nextState.uiSchema,
      '#/properties/melding/properties/name',
    );
    expect(ref && ref.$ref).toBe('#/definitions/name');
    const item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/name',
    );
    expect(item && item.type).toBe('string');

    // test promotion of root item.
    const payload2 = {
      path: '#/properties/melding',
    };
    nextState = reducer(nextState, promoteProperty(payload2));
    const item2 = getUiSchemaItem(nextState.uiSchema, '#/properties/melding');
    expect(item2 && item2.$ref).toBe('#/definitions/melding');
  });

  it('handles setting combination type', () => {
    const combinationItemChild = {
      $ref: '#/definitions/Tekst_50',
      displayName: 'ref',
      path: '#/definitions/allOfTest/allOf/0',
      combinationItem: true,
    };

    // verify initial state => type is allOf
    let item = state.uiSchema.find((f) => f.path === '#/definitions/allOfTest');
    expect(item?.combination).toEqual([
      { ...combinationItemChild, path: '#/definitions/allOfTest/allOf/0' },
    ]);
    expect(item?.combinationKind).toEqual(CombinationKind.AllOf);

    const payload = {
      path: '#/definitions/allOfTest',
      type: CombinationKind.OneOf,
    };

    // change to oneOf => verify changed state
    let nextState = reducer(state, setCombinationType(payload));
    item = nextState.uiSchema.find((f) => f.path === '#/definitions/allOfTest');
    expect(item?.combination).toEqual([
      { ...combinationItemChild, path: '#/definitions/allOfTest/oneOf/0' },
    ]);
    expect(item?.combinationKind).toEqual('oneOf');

    // change to anyOf => verify changed state
    nextState = reducer(
      state,
      setCombinationType({
        ...payload,
        type: CombinationKind.AnyOf,
      }),
    );
    item = nextState.uiSchema.find((f) => f.path === '#/definitions/allOfTest');
    expect(item?.combination).toEqual([
      { ...combinationItemChild, path: '#/definitions/allOfTest/anyOf/0' },
    ]);
    expect(item?.combinationKind).toEqual(CombinationKind.AnyOf);

    // change back to allOf => verify state
    nextState = reducer(
      nextState,
      setCombinationType({
        ...payload,
        type: CombinationKind.AllOf,
      }),
    );
    item = nextState.uiSchema.find((f) => f.path === '#/definitions/allOfTest');
    expect(item?.combination).toEqual([
      { ...combinationItemChild, path: '#/definitions/allOfTest/allOf/0' },
    ]);
    expect(item?.combinationKind).toEqual(CombinationKind.AllOf);
  });

  it('handles deleting a "combination" (anyOf, allOf, oneOf) child and shifting children paths', () => {
    let item = state.uiSchema.find(
      (f) => f.path === '#/definitions/anyOfTestSeveralItems',
    );
    expect(item?.combination?.length).toBe(4);
    const nextState = reducer(
      state,
      deleteCombinationItem({
        path: '#/definitions/anyOfTestSeveralItems/anyOf/1',
      }),
    );
    item = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/anyOfTestSeveralItems',
    );
    expect(item?.combination?.length).toBe(3);
    expect(item?.combination?.[0].path).toBe(
      '#/definitions/anyOfTestSeveralItems/anyOf/0',
    );
    expect(item?.combination?.[1].path).toBe(
      '#/definitions/anyOfTestSeveralItems/anyOf/1',
    );
    expect(item?.combination?.[2].path).toBe(
      '#/definitions/anyOfTestSeveralItems/anyOf/2',
    );
  });

  it('resets selectedDefinitionNodeId when deleting a combination child that is currently selected', () => {
    const path = '#/definitions/anyOfTestSeveralItems/anyOf/1';
    const mockState: ISchemaState = {
      ...state,
      selectedDefinitionNodeId: path,
    };
    const nextState = reducer(mockState, deleteCombinationItem({ path }));
    expect(nextState.selectedDefinitionNodeId).toBe('');
  });

  it('resets selectedPropertiesNodeId when deleting a combination child that is currently selected', () => {
    const path = '#/definitions/anyOfTestSeveralItems/anyOf/1';
    const mockState: ISchemaState = {
      ...state,
      selectedPropertyNodeId: path,
    };
    const nextState = reducer(mockState, deleteCombinationItem({ path }));
    expect(nextState.selectedDefinitionNodeId).toBe('');
  });

  it('handles adding child items to a combination', () => {
    // anyOf
    const anyOfItem = state.uiSchema.find(
      (f) => f.path === '#/definitions/anyOfTestSeveralItems',
    );
    expect(anyOfItem?.combination?.length).toBe(4);
    let nextState = reducer(
      state,
      addCombinationItem({
        path: '#/definitions/anyOfTestSeveralItems',
        props: { type: FieldType.String, displayName: '' },
      }),
    );
    const updatedAnyOfItem = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/anyOfTestSeveralItems',
    );
    expect(updatedAnyOfItem?.combination?.length).toBe(5);
    expect(updatedAnyOfItem?.combination?.[4].type).toBe('string');

    // allOf
    const allOfItem = state.uiSchema.find(
      (f) => f.path === '#/definitions/allOfTest',
    );
    expect(allOfItem?.combination?.length).toBe(1);
    nextState = reducer(
      state,
      addCombinationItem({
        path: '#/definitions/allOfTest',
        props: { type: FieldType.String, displayName: '' },
      }),
    );
    const updatedAllOfItem = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/allOfTest',
    );
    expect(updatedAllOfItem?.combination?.length).toBe(2);
    expect(updatedAllOfItem?.combination?.[1].type).toBe(FieldType.String);

    // oneOf
    const oneOfItem = state.uiSchema.find(
      (f) => f.path === '#/definitions/oneOfTestNullable',
    );
    expect(oneOfItem?.combination?.length).toBe(2);
    nextState = reducer(
      state,
      addCombinationItem({
        path: '#/definitions/oneOfTestNullable',
        props: { type: FieldType.String, displayName: '' },
      }),
    );
    const updatedOneOfItem = nextState.uiSchema.find(
      (f) => f.path === '#/definitions/oneOfTestNullable',
    );
    expect(updatedOneOfItem?.combination?.length).toBe(3);
    expect(updatedOneOfItem?.combination?.[2].type).toBe(FieldType.String);
  });
});
