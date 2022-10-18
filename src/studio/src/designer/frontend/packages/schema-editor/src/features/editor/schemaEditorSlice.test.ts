import {
  addCombinationItem,
  addEnum,
  addProperty,
  addRootItem,
  changeChildrenOrder,
  deleteCombinationItem,
  deleteEnum,
  deleteProperty,
  initialState,
  navigateToType,
  promoteProperty,
  reducer,
  setCombinationType,
  setDescription,
  setJsonSchema,
  setPropertyName,
  setRef,
  setRequired,
  setRestriction,
  setSelectedId,
  setSelectedTab,
  setTitle,
  setType,
  setUiSchema,
  toggleArrayField,
  updateJsonSchema,
} from './schemaEditorSlice';
import { dataMock } from '../../mockData';
import type { ISchemaState } from '../../types';
import {
  CombinationKind,
  FieldType,
  getChildNodesByPointer,
  getNodeByPointer,
  getReferredNodes,
  hasNodePointer,
  Keywords,
  makePointer,
  ObjectKind,
  UiSchemaNode,
} from '@altinn/schema-model';

describe('SchemaEditorSlice', () => {
  let state: ISchemaState;
  beforeEach(() => {
    // setup state
    const state1: ISchemaState = reducer(initialState, setJsonSchema({ schema: dataMock }));
    state = reducer(state1, setUiSchema({ name: '#/$defs/RA-0678_M' }));
  });

  it('handles setFieldValue', () => {
    const payload = {
      key: 'minLength',
      path: '#/$defs/Kommentar2000Restriksjon',
      value: '666',
    };
    const nextState = reducer(state, setRestriction(payload));
    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kommentar2000Restriksjon');
    if (!item.restrictions) {
      fail('item not found');
    }
    const field = item.restrictions.minLength;
    if (!field) {
      fail('field not found');
    }
    expect(field).toBe(666);
  });
  it('handles that setPropertyName comes with empty string', () => {
    const nextState = reducer(
      state,
      setPropertyName({
        path: '#/$defs/Kontaktperson/properties/navn',
        name: '',
        navigate: true,
      }),
    );
    expect(nextState).toBe(state);
  });
  it('handles setPropertyName', () => {
    let nextState = reducer(
      state,
      setPropertyName({
        path: '#/$defs/Kontaktperson/properties/navn',
        name: 'navn_endret',
      }),
    );
    let item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson/properties/navn_endret');
    expect(nextState.uiSchema).not.toHaveProperty('#/$defs/Kontaktperson/properties/navn');

    // test that child paths are also updated
    nextState = reducer(
      nextState,
      setPropertyName({
        path: '#/$defs/Kontaktperson',
        name: 'batman',
      }),
    );
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/batman');
    expect(item.children).toContain('#/$defs/batman/properties/navn_endret');
  });

  it('renames combination and children when renaming a combination', () => {
    const children = getChildNodesByPointer(state.uiSchema, '#/$defs/anyOfTestSeveralItems');
    expect(children[1].pointer).toBe('#/$defs/anyOfTestSeveralItems/anyOf/1');

    const nextState = reducer(
      state,
      setPropertyName({
        path: '#/$defs/anyOfTestSeveralItems',
        name: 'tullballeee',
      }),
    );

    const updatedAnyOfChildren = getChildNodesByPointer(nextState.uiSchema, '#/$defs/tullballeee');
    expect(updatedAnyOfChildren[1].pointer).toBe('#/$defs/tullballeee/anyOf/1');
  });

  it('handles setRef', () => {
    const payload = {
      path: '#/$defs/Kontaktperson/properties/navn',
      ref: '#/$defs/Tekst_25',
    };
    const nextState = reducer(state, setRef(payload));
    const item: UiSchemaNode = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson/properties/navn');
    expect(item.ref).toEqual('#/$defs/Tekst_25');
  });

  it('handles setSelectedId', () => {
    const payload = {
      id: '#/$defs/Kommentar2000Restriksjon',
    };
    const nextState = reducer({ ...state, selectedEditorTab: 'definitions' }, setSelectedId(payload));
    expect(nextState.selectedDefinitionNodeId).toEqual('#/$defs/Kommentar2000Restriksjon');
  });

  it('handles setSelectedId by properties tab', () => {
    const payload = {
      id: '#/properties/someField',
    };
    const nextState = reducer({ ...state, selectedEditorTab: 'properties' }, setSelectedId(payload));
    expect(nextState.selectedPropertyNodeId).toEqual('#/properties/someField');
  });

  it('handles navigateToType', () => {
    const payload = {
      id: '#/$defs/someField',
    };
    const nextState = reducer({ ...state, selectedEditorTab: 'properties' }, navigateToType(payload));
    expect(nextState.selectedEditorTab).toEqual('definitions');
    expect(nextState.selectedDefinitionNodeId).toEqual('#/$defs/someField');
  });

  it('handles setSelectedTab', () => {
    const payload: { selectedTab: 'definitions' | 'properties' } = {
      selectedTab: 'definitions',
    };
    const nextState = reducer({ ...state, selectedEditorTab: 'properties' }, setSelectedTab(payload));
    expect(nextState.selectedEditorTab).toEqual('definitions');
  });

  it('handles deleteProperty', () => {
    const payload = {
      path: '#/$defs/Kontaktperson/properties/navn',
    };
    const nextState = reducer(state, deleteProperty(payload));
    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson');
    expect(item.children).not.toContainEqual({
      path: '#/$defs/Kontaktperson/properties/navn',
    });
  });

  it('throws error when deleting selected definition with referred nodes', () => {
    const mockState = {
      ...state,
      selectedEditorTab: 'definitions',
      selectedDefinitionNodeId: '#/$defs/Kommentar2000Restriksjon',
    } as ISchemaState;
    expect(() => {
      reducer(
        mockState,
        deleteProperty({
          path: '#/$defs/Kommentar2000Restriksjon',
        }),
      );
    }).toThrow();
  });

  it('resets selected id when deleting selected property', () => {
    const mockState = {
      ...state,
      selectedEditorTab: 'properties',
      selectedPropertyNodeId: '#/properties/melding',
    } as ISchemaState;
    const nextState = reducer(
      mockState,
      deleteProperty({
        path: '#/properties/melding',
      }),
    );
    expect(nextState.selectedPropertyNodeId).toEqual('');
  });

  it('handles deleteProperty (root definition)', () => {
    const payload = {
      path: '#/$defs/Kontaktperson',
    };
    let nextState = state;
    getReferredNodes(state.uiSchema, payload.path).forEach((refNode) => {
      nextState = reducer(
        nextState,
        deleteProperty({
          path: refNode.pointer,
        }),
      );
    });
    nextState = reducer(nextState, deleteProperty(payload));
    expect(() => {
      getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson');
    }).toThrowError();

    expect(hasNodePointer(nextState.uiSchema, '#/$defs/Kontaktperson')).toBeFalsy();
  });

  it('should throw when using deleteProperty (root definition) when there is nodes', () =>
    expect(() => {
      reducer(
        state,
        deleteProperty({
          path: '#/$defs/Kontaktperson',
        }),
      );
    }).toThrowError());

  it('handles addProperty', () => {
    const payload = {
      pointer: '#/$defs/Kontaktperson',
      props: {
        fieldType: FieldType.Object,
      } as Partial<UiSchemaNode>,
    };
    const nextState = reducer(state, addProperty(payload));

    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson');
    expect(item.children).toContain('#/$defs/Kontaktperson/properties/name');

    const itemChild = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson/properties/name');
    expect(itemChild.fieldType).toBe(FieldType.Object);
  });

  it('handles addRootItem', () => {
    const payload = {
      name: 'superman',
      location: '#/$defs',
      props: {
        fieldType: FieldType.Object,
      } as Partial<UiSchemaNode>,
    };

    let nextState = reducer(state, addRootItem(payload));
    const newRootItem = getNodeByPointer(nextState.uiSchema, '#/$defs/superman');
    expect(newRootItem.fieldType).toBe(FieldType.Object);

    nextState = reducer(nextState, addRootItem(payload));
    const newRootItem0 = getNodeByPointer(nextState.uiSchema, '#/$defs/superman0');
    expect(newRootItem0.fieldType).toBe(FieldType.Object);
    expect(nextState.selectedDefinitionNodeId).toBe('#/$defs/superman0');
  });

  it('handles addEnum & deleteEnum', () => {
    const payload = {
      path: '#/$defs/StatistiskeEnhetstyper',
      value: 'test',
      oldValue: '',
    };

    // add
    let nextState = reducer(state, addEnum(payload));
    let item = getNodeByPointer(nextState.uiSchema, '#/$defs/StatistiskeEnhetstyper');
    expect(item.enum).toContainEqual('test');
    // rename
    payload.oldValue = 'test';
    payload.value = 'test2';
    nextState = reducer(nextState, addEnum(payload));
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/StatistiskeEnhetstyper');

    expect(item.enum).not.toContainEqual('test');
    expect(item.enum).toContainEqual('test2');
    // delete
    nextState = reducer(nextState, deleteEnum(payload));
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/StatistiskeEnhetstyper');
    expect(item.enum).not.toContainEqual('test2');
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
      path: '#/$defs/Kontaktperson',
    };
    const nextState = reducer(state, setTitle(payload));
    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson');
    expect(item.title).toBe('test12312');
  });

  it('handles setDescription', () => {
    const payload = {
      description: 'descriptionasdsfsa',
      path: '#/$defs/Kontaktperson',
    };
    const nextState = reducer(state, setDescription(payload));

    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson');
    expect(item.description).toBe('descriptionasdsfsa');
  });

  it('handles setType', () => {
    const payload = {
      path: '#/$defs/Kontaktperson',
      type: FieldType.String,
    };
    const nextState = reducer(state, setType(payload));
    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/Kontaktperson');
    expect(item.fieldType).toBe(FieldType.String);
  });

  it('handles setRequired', () => {
    const payload = {
      path: '#/$defs/Kontaktperson/properties/navn',
      key: 'navn',
      required: true,
    };
    let nextState = reducer(state, setRequired(payload));
    let item = getNodeByPointer(nextState.uiSchema, payload.path);
    expect(item.isRequired).toBeTruthy();

    payload.required = false;
    nextState = reducer(state, setRequired(payload));
    item = getNodeByPointer(nextState.uiSchema, payload.path);
    expect(item.isRequired).toBeFalsy();
  });

  it('handles promotion of root-level types', () => {
    const schema = {
      [Keywords.Properties]: {
        melding: {
          [Keywords.Properties]: {
            name: {
              [Keywords.Type]: FieldType.String,
            },
          },
        },
      },
      [Keywords.Definitions]: {},
    };
    let nextState = reducer(state, setJsonSchema({ schema }));
    nextState = reducer(nextState, setUiSchema({ name: 'test' }));

    const prop = getNodeByPointer(nextState.uiSchema, '#/properties/melding/properties/name');

    expect(prop.fieldType).toBe(FieldType.String);

    const payload = {
      path: '#/properties/melding/properties/name',
    };
    nextState = reducer(nextState, promoteProperty(payload));
    const ref = getNodeByPointer(nextState.uiSchema, '#/properties/melding/properties/name');
    expect(ref.ref).toBe('#/$defs/name');
    const item = getNodeByPointer(nextState.uiSchema, '#/$defs/name');
    expect(item.fieldType).toBe(FieldType.String);

    // test promotion of root item.
    const payload2 = {
      path: '#/properties/melding',
    };
    nextState = reducer(nextState, promoteProperty(payload2));
    const item2 = getNodeByPointer(nextState.uiSchema, '#/properties/melding');
    expect(item2.ref).toBe('#/$defs/melding');
  });

  it('handles setting combination type', () => {
    // verify initial state => type is allOf
    let item = getNodeByPointer(state.uiSchema, '#/$defs/allOfTest');
    const childNodes = getChildNodesByPointer(state.uiSchema, '#/$defs/allOfTest');
    expect(childNodes[0].ref).toBe('#/$defs/Tekst_50');
    expect(childNodes[0].pointer).toBe('#/$defs/allOfTest/allOf/0');
    expect(item.objectKind).toBe(ObjectKind.Combination);
    expect(item.fieldType).toEqual(CombinationKind.AllOf);

    // change to oneOf => verify changed state
    let nextState = reducer(
      state,
      setCombinationType({
        path: '#/$defs/allOfTest',
        type: CombinationKind.OneOf,
      }),
    );
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/allOfTest');

    expect(item.children).toEqual(['#/$defs/allOfTest/oneOf/0']);
    expect(item.fieldType).toEqual(CombinationKind.OneOf);

    // change to anyOf => verify changed state
    nextState = reducer(
      state,
      setCombinationType({
        path: '#/$defs/allOfTest',
        type: CombinationKind.AnyOf,
      }),
    );
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/allOfTest');
    expect(item.children).toEqual(['#/$defs/allOfTest/anyOf/0']);
    expect(item.fieldType).toEqual(CombinationKind.AnyOf);

    // change back to allOf => verify state
    nextState = reducer(
      nextState,
      setCombinationType({
        path: '#/$defs/allOfTest',
        type: CombinationKind.AllOf,
      }),
    );
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/allOfTest');
    expect(item.children).toEqual(['#/$defs/allOfTest/allOf/0']);
    expect(item.fieldType).toEqual(CombinationKind.AllOf);
  });

  it('handles deleting a "combination" (anyOf, allOf, oneOf) child and shifting children paths', () => {
    let item = getNodeByPointer(state.uiSchema, '#/$defs/anyOfTestSeveralItems');
    expect(item.children).toHaveLength(4);
    const nextState = reducer(
      state,
      deleteCombinationItem({
        path: '#/$defs/anyOfTestSeveralItems/anyOf/1',
      }),
    );
    item = getNodeByPointer(nextState.uiSchema, '#/$defs/anyOfTestSeveralItems');
    expect(item.children).toHaveLength(3);
    expect(item.children[0]).toBe('#/$defs/anyOfTestSeveralItems/anyOf/0');
    expect(item.children[1]).toBe('#/$defs/anyOfTestSeveralItems/anyOf/1');
    expect(item.children[2]).toBe('#/$defs/anyOfTestSeveralItems/anyOf/2');
  });

  it('resets selectedDefinitionNodeId when deleting a combination child that is currently selected', () => {
    const path = '#/$defs/anyOfTestSeveralItems/anyOf/1';
    const mockState: ISchemaState = {
      ...state,
      selectedDefinitionNodeId: path,
    };
    const nextState = reducer(mockState, deleteCombinationItem({ path }));
    expect(nextState.selectedDefinitionNodeId).toBe('');
  });

  it('resets selectedPropertiesNodeId when deleting a combination child that is currently selected', () => {
    const path = '#/$defs/anyOfTestSeveralItems/anyOf/1';
    const mockState: ISchemaState = {
      ...state,
      selectedPropertyNodeId: path,
    };
    const nextState = reducer(mockState, deleteCombinationItem({ path }));
    expect(nextState.selectedPropertyNodeId).toBe('');
  });

  it('handles adding child items to a combination', () => {
    // anyOf
    const anyOfItem = getNodeByPointer(state.uiSchema, '#/$defs/anyOfTestSeveralItems');
    expect(anyOfItem.children).toHaveLength(4);
    let nextState = reducer(
      state,
      addCombinationItem({
        pointer: '#/$defs/anyOfTestSeveralItems',
        props: { fieldType: FieldType.String },
      }),
    );
    const updatedAnyOfItem = getNodeByPointer(nextState.uiSchema, '#/$defs/anyOfTestSeveralItems');
    expect(updatedAnyOfItem.children).toHaveLength(5);

    const updatedAnyOfItemChildren = getChildNodesByPointer(nextState.uiSchema, '#/$defs/anyOfTestSeveralItems');
    expect(updatedAnyOfItemChildren[4].fieldType).toBe(FieldType.String);

    // allOf
    const allOfItem = getNodeByPointer(state.uiSchema, '#/$defs/allOfTest');
    expect(allOfItem.children).toHaveLength(1);
    nextState = reducer(
      state,
      addCombinationItem({
        pointer: '#/$defs/allOfTest',
        props: { fieldType: FieldType.String },
      }),
    );
    const updatedAllOfItem = getNodeByPointer(nextState.uiSchema, '#/$defs/allOfTest');
    expect(updatedAllOfItem.children).toHaveLength(2);
    const updatedAllOfItemChild = getNodeByPointer(nextState.uiSchema, updatedAllOfItem.children[1]);
    expect(updatedAllOfItemChild.fieldType).toBe(FieldType.String);

    // oneOf
    const oneOfItem = getNodeByPointer(state.uiSchema, '#/$defs/oneOfTestNullable');
    expect(oneOfItem.children).toHaveLength(2);
    nextState = reducer(
      state,
      addCombinationItem({
        pointer: '#/$defs/oneOfTestNullable',
        props: { fieldType: FieldType.String },
      }),
    );
    const updatedOneOfItem = getNodeByPointer(nextState.uiSchema, '#/$defs/oneOfTestNullable');

    expect(updatedOneOfItem.children).toHaveLength(3);
    const updatedOneOfItemChild = getNodeByPointer(nextState.uiSchema, updatedOneOfItem.children[2]);
    expect(updatedOneOfItemChild.fieldType).toBe(FieldType.String);
  });
  it('should handle to toggleArrayField', () => {
    const pointer = makePointer(Keywords.Properties, 'melding');
    const mockState: ISchemaState = {
      ...state,
      selectedPropertyNodeId: pointer,
    };
    const nextState = reducer(mockState, toggleArrayField({ pointer }));
    const expectedArray = getNodeByPointer(nextState.uiSchema, pointer);
    expect(expectedArray.children).toHaveLength(0);
    expect(expectedArray.isArray).toBeTruthy();
    expect(expectedArray.objectKind).toBe(ObjectKind.Reference);
    const nextState2 = reducer(nextState, toggleArrayField({ pointer }));
    const expectedField = getNodeByPointer(nextState2.uiSchema, pointer);
    expect(expectedField.children).toHaveLength(0);
    expect(expectedField.isArray).toBeFalsy();
    expect(expectedField.objectKind).toBe(ObjectKind.Reference);
  });
  it('should handle to changeChildrenOrder', () => {
    const parentPointer = makePointer(Keywords.Definitions, 'RA-0678_M');
    const parentNodeBefore = getNodeByPointer(state.uiSchema, parentPointer);
    const pointerA = makePointer(parentPointer, Keywords.Properties, 'dataFormatId');
    const pointerB = makePointer(parentPointer, Keywords.Properties, 'InternInformasjon');
    const nextState = reducer(state, changeChildrenOrder({ pointerA, pointerB }));
    const parentNode = getNodeByPointer(nextState.uiSchema, parentPointer);
    expect(parentNode.children[1]).toBe(pointerB);
    expect(parentNode.children[3]).toBe(pointerA);
    expect(parentNode.children.length).toBe(parentNodeBefore.children.length);

    const expectedUnchanged = reducer(
      nextState,
      changeChildrenOrder({ pointerA, pointerB: makePointer(Keywords.Properties, 'jibberish') }),
    );
    expect(nextState).toBe(expectedUnchanged);
  });
});
