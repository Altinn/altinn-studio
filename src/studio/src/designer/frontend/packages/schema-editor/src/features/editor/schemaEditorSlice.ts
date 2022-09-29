import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IJsonSchema, ISchemaState } from '../../types';
import { getSchemaSettings } from '../../settings';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  buildJsonSchema,
  buildUiSchema,
  CombinationKind,
  createNodeBase,
  FieldType,
  getNodeByPointer,
  getNodeIndexByPointer,
  getUniqueNodePath,
  Keywords,
  ObjectKind,
  promotePropertyToType,
  removeItemByPointer,
  renameItemPointer,
  replaceLastPointerSegment,
  ROOT_POINTER,
} from '@altinn/schema-model';

export const initialState: ISchemaState = {
  schema: {},
  uiSchema: [],
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
      const newPointer = getUniqueNodePath(state.uiSchema, [location, name].join('/'));
      const schemaSettings = getSchemaSettings({ schemaUrl: state.schema.$schema });
      const newNode = createNodeBase(newPointer);
      newNode.implicitType = false;
      state.uiSchema.push(Object.assign(newNode, props));
      getNodeByPointer(state.uiSchema, ROOT_POINTER).children.push(newPointer);

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
      const newNodePointer = getUniqueNodePath(state.uiSchema, [path, Keywords.Properties, 'name'].join('/'));
      const addToItem = getNodeByPointer(state.uiSchema, path);
      addToItem.children.push(newNodePointer);
      if (!keepSelection) {
        if (state.selectedEditorTab === 'definitions') {
          state.selectedDefinitionNodeId = newNodePointer;
        } else {
          state.selectedPropertyNodeId = newNodePointer;
        }
        state.focusNameField = newNodePointer;
      }
      state.uiSchema.push(Object.assign(createNodeBase(newNodePointer), props));
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
      const restrictions = schemaItem.restrictions ?? {};
      schemaItem.restrictions = {
        ...restrictions,
        [key]: value,
      };
    },
    setItems(
      state,
      action: PayloadAction<{
        path: string;
        items: Partial<UiSchemaNode>;
      }>,
    ) {
      const { path, items } = action.payload;
      const itemPointer = [path, Keywords.Items].join('/');
      const uiSchemaNode = getNodeByPointer(state.uiSchema, path);
      if (!uiSchemaNode.children.includes(itemPointer)) {
        uiSchemaNode.children.push(itemPointer); // Ensure that the parent is refered
      }
      const newNode = Object.assign(createNodeBase(itemPointer), items);
      const itemsIndex = getNodeIndexByPointer(state.uiSchema, itemPointer);
      state.uiSchema[itemsIndex !== undefined ? itemsIndex : 0] = newNode;
    },
    setRef(state, action: PayloadAction<{ path: string; ref: string }>) {
      const { path, ref } = action.payload;
      const referedNode = getNodeByPointer(state.uiSchema, ref);
      const uiSchemaNode = getNodeByPointer(state.uiSchema, path);
      uiSchemaNode.ref = ref;
      uiSchemaNode.objectKind = ObjectKind.Reference;
      uiSchemaNode.fieldType = referedNode.fieldType;
      uiSchemaNode.implicitType = true;
    },
    setType(state, action: PayloadAction<{ path: string; type: FieldType }>) {
      const { path, type } = action.payload;
      const uiSchemaNode = getNodeByPointer(state.uiSchema, path);
      uiSchemaNode.ref = undefined;
      uiSchemaNode.children = [];
      uiSchemaNode.fieldType = type;
      uiSchemaNode.implicitType = false;
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
    addCombinationItem(state, action: PayloadAction<{ path: string; props: Partial<UiSchemaNode> }>) {
      const { path, props } = action.payload;
      const addToNode = getNodeByPointer(state.uiSchema, path);
      const pointer = [path, addToNode.fieldType, addToNode.children.length].join('/');
      const item = Object.assign(createNodeBase(pointer), props);
      item.isCombinationItem = true;
      addToNode.children.push(pointer);
      state.uiSchema.push(item);
      state.selectedEditorTab === 'definitions'
        ? (state.selectedDefinitionNodeId = pointer)
        : (state.selectedPropertyNodeId = pointer);
    },
    setJsonSchema(state, action) {
      const { schema } = action.payload;
      state.schema = schema;
    },
    setPropertyName(state, action: PayloadAction<{ path: string; name: string; navigate?: boolean }>) {
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
