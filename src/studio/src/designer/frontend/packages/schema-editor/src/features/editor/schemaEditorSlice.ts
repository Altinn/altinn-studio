import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer';
import { IJsonSchema, ISchemaState } from '../../types';
import { getSchemaSettings } from '../../settings';
import {
  buildJsonSchema,
  buildUiSchema,
  CombinationKind,
  FieldType,
  getNodeByPointer,
  getUniqueNodePath,
  Keywords,
  ObjectKind,
  promotePropertyToType,
  removeItemByPointer,
  renameItemPointer,
  replaceLastPointerSegment,
  ROOT_POINTER,
  UiSchemaNode,
} from '@altinn/schema-model';

enableMapSet();

export const initialState: ISchemaState = {
  schema: {},
  uiSchema: new Map(),
  name: '/',
  saveSchemaUrl: '',
  selectedPropertyNodeId: '',
  selectedDefinitionNodeId: '',
  focusNameField: '',
  selectedEditorTab: 'properties',
};

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    addRestriction(state, action: PayloadAction<{ path: string; value: string; key: string }>) {
      const { path, value, key } = action.payload;
      const addToItem = getNodeByPointer(state.uiSchema, path);
      addToItem.restrictions[key] = value;
    },
    addEnum(state, action: PayloadAction<{ path: string; value: string; oldValue?: string }>) {
      const { path, value, oldValue } = action.payload;
      const addToItem = getNodeByPointer(state.uiSchema, path);
      if (!addToItem.enum) {
        addToItem.enum = [];
      }
      if (!oldValue) {
        addToItem.enum.push(value);
      }
      if (oldValue && addToItem.enum.includes(oldValue)) {
        addToItem.enum[addToItem.enum.indexOf(oldValue)] = value;
      }
      if (!addToItem.enum.includes(value)) {
        addToItem.enum.push(value);
      }
    },
    addRootItem(
      state,
      action: PayloadAction<{
        location: string;
        name: string;
        props: Partial<UiSchemaNode>;
      }>,
    ) {
      const { location, name, props } = action.payload;
      const newPointer = getUniqueNodePath(state.uiSchema, `${location}/${name}`);
      const schemaSettings = getSchemaSettings({
        schemaUrl: state.schema.$schema,
      });
      const newItem = {
        ...props,
        pointer: newPointer,
      };
      // @ts-ignore
      state.uiSchema.set(newPointer, newItem);
      if (location === schemaSettings.definitionsPath) {
        state.selectedDefinitionNodeId = newPointer;
      } else {
        state.selectedPropertyNodeId = newPointer;
      }
      state.focusNameField = newPointer;
    },
    clearNameFocus(state) {
      state.focusNameField = undefined;
    },
    addProperty(
      state,
      action: PayloadAction<{
        path: string;
        keepSelection?: boolean;
        props?: Partial<UiSchemaNode>;
      }>,
    ) {
      const { path, keepSelection, props } = action.payload;
      const addToItem = getNodeByPointer(state.uiSchema, path);
      const newNodePointer = getUniqueNodePath(
        state.uiSchema,
        [path, Keywords.Properties, 'name'].join('/'),
      );
      addToItem.children.push(newNodePointer);
      if (!keepSelection) {
        if (state.selectedEditorTab === 'definitions') {
          state.selectedDefinitionNodeId = newNodePointer;
        } else {
          state.selectedPropertyNodeId = newNodePointer;
        }
        state.focusNameField = newNodePointer;
      }

      // @ts-ignore
      const item: UiSchemaNode = {
        ...props,
        pointer: newNodePointer,
      };
      state.uiSchema.set(newNodePointer, item);
    },
    deleteField(state, action: PayloadAction<{ path: string; key: string }>) {
      const { path, key } = action.payload;
      const removeFromItem = getNodeByPointer(state.uiSchema, path);
      delete removeFromItem.restrictions[key];
    },
    deleteEnum(state, action: PayloadAction<{ path: string; value: string }>) {
      const { path, value } = action.payload;
      const removeFromItem = getNodeByPointer(state.uiSchema, path);
      const removeIndex = removeFromItem.enum?.findIndex((v: any) => v === value) ?? -1;
      if (removeIndex >= 0) {
        removeFromItem.enum?.splice(removeIndex, 1);
      }
    },
    promoteProperty(state, action: PayloadAction<{ path: string }>) {
      const { path } = action.payload;
      state.uiSchema = promotePropertyToType(state.uiSchema, path);
    },
    deleteProperty(state, action: PayloadAction<{ path: string }>) {
      const { path } = action.payload;
      state.uiSchema = removeItemByPointer(state.uiSchema, path);
      if (state.selectedDefinitionNodeId === path) {
        state.selectedDefinitionNodeId = '';
      } else if (state.selectedPropertyNodeId === path) {
        state.selectedPropertyNodeId = '';
      }
    },
    deleteCombinationItem(state, action: PayloadAction<{ path: string }>) {
      // removing a "combination" array item (foo.anyOf[i]), could be oneOf, allOf, anyOf
      const { path } = action.payload;

      if (state.selectedDefinitionNodeId === path) {
        state.selectedDefinitionNodeId = '';
      }
      if (state.selectedPropertyNodeId === path) {
        state.selectedPropertyNodeId = '';
      }
      state.uiSchema = removeItemByPointer(state.uiSchema, path);
    },
    setRestriction(state, action: PayloadAction<{ path: string; value: string; key: string }>) {
      const { path, value, key } = action.payload;
      const schemaItem = getNodeByPointer(state.uiSchema, path);
      schemaItem.restrictions = schemaItem.restrictions ?? {};
      schemaItem.restrictions[key] = value;
    },
    setItems(
      state,
      action: PayloadAction<{
        path: string;
        items: { fieldType?: string; $ref?: string };
      }>,
    ) {
      const { path, items } = action.payload;
      const uiSchemaNode = getNodeByPointer(state.uiSchema, path);
      const itemPointer = [path, Keywords.Items].join();

      if (!uiSchemaNode.children.includes(itemPointer)) {
        uiSchemaNode.children.push(itemPointer); // Ensure that the parent is refered
      }
      // @ts-ignore
      state.uiSchema.set(itemPointer, items);
    },
    setRef(state, action: PayloadAction<{ path: string; ref: string }>) {
      const { path, ref } = action.payload;
      const referedNode = getNodeByPointer(state.uiSchema, ref);
      const schemaItem = getNodeByPointer(state.uiSchema, path);
      schemaItem.ref = ref;
      schemaItem.objectKind = ObjectKind.Reference;
      schemaItem.fieldType = referedNode.fieldType;
      schemaItem.implicitType = true;
    },
    setType(state, action: PayloadAction<{ path: string; type: FieldType }>) {
      const { path, type } = action.payload;
      const schemaNode = getNodeByPointer(state.uiSchema, path);
      schemaNode.ref = undefined;
      schemaNode.children = [];
      schemaNode.fieldType = type;
    },
    setTitle(state, action: PayloadAction<{ path: string; title: string }>) {
      const { path, title } = action.payload;
      getNodeByPointer(state.uiSchema, path).title = title;
    },
    setDescription(state, action: PayloadAction<{ path: string; description: string }>) {
      const { path, description } = action.payload;
      getNodeByPointer(state.uiSchema, path).description = description;
    },
    setRequired(state, action: PayloadAction<{ path: string; required: boolean }>) {
      const { path, required } = action.payload;
      getNodeByPointer(state.uiSchema, path).isRequired = required;
    },
    setCombinationType(state, action: PayloadAction<{ type: CombinationKind; path: string }>) {
      const { type, path } = action.payload;
      const uiSchemaNode = getNodeByPointer(state.uiSchema, path);
      const oldPointer = [path, uiSchemaNode.fieldType].join('/');
      const newPointer = [path, type].join('/');
      uiSchemaNode.fieldType = type;
      state.uiSchema = renameItemPointer(state.uiSchema, oldPointer, newPointer);
    },
    addCombinationItem(
      state,
      action: PayloadAction<{ path: string; props: Partial<UiSchemaNode> }>,
    ) {
      const { path, props } = action.payload;
      const addToNode = getNodeByPointer(state.uiSchema, path);
      const pointer = [path, addToNode.fieldType, addToNode.children.length].join('/');
      // @ts-ignore
      const item: UiSchemaNode = {
        ...props,
        pointer: pointer,
        objectKind: ObjectKind.Combination,
      };
      addToNode.children.push(pointer);
      state.uiSchema.set(pointer, item);
    },
    setJsonSchema(state, action) {
      const { schema } = action.payload;
      state.schema = schema;
    },
    setPropertyName(
      state,
      action: PayloadAction<{ path: string; name: string; navigate?: string }>,
    ) {
      const { path, navigate, name } = action.payload;
      if (!name || name.length === 0) {
        return;
      }
      const nodeToRename = getNodeByPointer(state.uiSchema, path);
      const oldPointer = nodeToRename.pointer;
      const newPointer = replaceLastPointerSegment(oldPointer, name);
      state.uiSchema = renameItemPointer(state.uiSchema, nodeToRename.pointer, newPointer);
      if (navigate) {
        state.selectedEditorTab === 'definitions'
          ? (state.selectedDefinitionNodeId = newPointer)
          : (state.selectedPropertyNodeId = newPointer);
      }
    },
    setSchemaName(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      state.name = name;
    },
    setSelectedId(state, action: PayloadAction<{ id: string; focusName?: string }>) {
      const { id, focusName } = action.payload;
      state.focusNameField = focusName;
      state.selectedEditorTab === 'definitions'
        ? (state.selectedDefinitionNodeId = id)
        : (state.selectedPropertyNodeId = id);
    },
    setSaveSchemaUrl(state, action: PayloadAction<{ saveUrl: string }>) {
      state.saveSchemaUrl = action.payload.saveUrl;
    },
    setUiSchema(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      state.uiSchema = buildUiSchema(state.schema);
      state.name = name;
      state.focusNameField = ROOT_POINTER;
      state.selectedDefinitionNodeId = ROOT_POINTER;
      state.selectedPropertyNodeId = ROOT_POINTER;
    },
    updateJsonSchema(state, action: PayloadAction<{ onSaveSchema: (payload: any) => void }>) {
      const { onSaveSchema } = action.payload;
      const updatedSchema: IJsonSchema = buildJsonSchema(state.uiSchema);
      state.schema = updatedSchema;
      if (onSaveSchema) {
        onSaveSchema(updatedSchema);
      }
    },
    setSelectedTab(state, action: PayloadAction<{ selectedTab: 'definitions' | 'properties' }>) {
      const { selectedTab } = action.payload;
      state.selectedEditorTab = selectedTab;
    },
    navigateToType(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      state.selectedEditorTab = 'definitions';
      state.selectedDefinitionNodeId = id;
    },
  },
});

export const { reducer } = schemaEditorSlice;

export const {
  addCombinationItem,
  addEnum,
  addProperty,
  addRestriction,
  addRootItem,
  deleteCombinationItem,
  deleteEnum,
  deleteField,
  deleteProperty,
  navigateToType,
  promoteProperty,
  setCombinationType,
  setDescription,
  setItems,
  setJsonSchema,
  setPropertyName,
  setRef,
  setRequired,
  setRestriction,
  setSchemaName,
  setSelectedId,
  setSelectedTab,
  setTitle,
  setType,
  setUiSchema,
  updateJsonSchema,
} = schemaEditorSlice.actions;
