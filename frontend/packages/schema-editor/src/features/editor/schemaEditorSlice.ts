import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { SchemaState } from '../../types';
import type { UiSchemaNode, CombinationKind, FieldType } from '@altinn/schema-model';
import {
  buildJsonSchema,
  buildUiSchema,
  pointerIsDefinition,
  ROOT_POINTER,
  addEnumValue as addEnumReducer,
  addRootItem as addRootItemReducer,
  addProperty as addPropertyReducer,
  deleteEnumValue as deleteEnumReducer,
  promoteProperty as promotePropertyReducer,
  deleteNode as deleteNodeReducer,
  setRestriction as setRestrictionReducer,
  setRestrictions as setRestrictionsReducer,
  setRef as setRefReducer,
  setType as setTypeReducer,
  setTitle as setTitleReducer,
  setDescription as setDescriptionReducer,
  setRequired as setRequiredReducer,
  setCombinationType as setCombinationTypeReducer,
  addCombinationItem as addCombinationItemReducer,
  setPropertyName as setPropertyNameReducer,
  toggleArrayField as toggleArrayFieldReducer,
  changeChildrenOrder as changeChildrenOrderReducer,
} from '@altinn/schema-model';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { JSONSchema7 } from 'json-schema';

export const initialState: SchemaState = {
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
      state.uiSchema = addEnumReducer(state.uiSchema, action.payload);
    },
    addRootItem(
      state,
      action: PayloadAction<{
        location: string;
        name: string;
        props: Partial<UiSchemaNode>;
      }>
    ) {
      state.uiSchema = addRootItemReducer(state.uiSchema, {
        ...action.payload,
        callback: (newPointer: string) => {
          if (pointerIsDefinition(newPointer)) state.selectedDefinitionNodeId = newPointer;
          else state.selectedPropertyNodeId = newPointer;
          state.focusNameField = newPointer;
        }
      });
    },
    addProperty(
      state,
      action: PayloadAction<{
        pointer: string;
        keepSelection?: boolean;
        props: Partial<UiSchemaNode>;
      }>
    ) {
      const { pointer, keepSelection, props } = action.payload;
      state.uiSchema = addPropertyReducer(state.uiSchema, {
        pointer,
        props,
        callback: (newPointer: string) => {
          if (!keepSelection) {
            if (pointerIsDefinition(newPointer)) state.selectedDefinitionNodeId = newPointer;
            else state.selectedPropertyNodeId = newPointer;
            state.focusNameField = newPointer;
          }
        }
      });
    },
    deleteEnum(state, action: PayloadAction<{ path: string; value: string }>) {
      state.uiSchema = deleteEnumReducer(state.uiSchema, action.payload);
    },
    promoteProperty(state, action: PayloadAction<{ path: string }>) {
      state.uiSchema = promotePropertyReducer(state.uiSchema, action.payload.path);
    },
    deleteProperty(state, action: PayloadAction<{ path: string }>) {
      const { path } = action.payload;
      state.uiSchema = deleteNodeReducer(state.uiSchema, path);
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
      state.uiSchema = deleteNodeReducer(state.uiSchema, path);
    },
    setRestriction(state, action: PayloadAction<{ path: string; key: string; value?: string | boolean }>) {
      state.uiSchema = setRestrictionReducer(state.uiSchema, action.payload);
    },
    setRestrictions(state, action: PayloadAction<{ path: string; restrictions: KeyValuePairs }>) {
      state.uiSchema = setRestrictionsReducer(state.uiSchema, action.payload);
    },
    setRef(state, action: PayloadAction<{ path: string; ref: string }>) {
      state.uiSchema = setRefReducer(state.uiSchema, action.payload);
    },
    setType(state, action: PayloadAction<{ path: string; type: FieldType }>) {
      state.uiSchema = setTypeReducer(state.uiSchema, action.payload);
    },
    setTitle(state, action: PayloadAction<{ path: string; title: string }>) {
      state.uiSchema = setTitleReducer(state.uiSchema, action.payload);
    },
    setDescription(state, action: PayloadAction<{ path: string; description: string }>) {
      state.uiSchema = setDescriptionReducer(state.uiSchema, action.payload);
    },
    setRequired(state, action: PayloadAction<{ path: string; required: boolean }>) {
      state.uiSchema = setRequiredReducer(state.uiSchema, action.payload);
    },
    setCombinationType(state, action: PayloadAction<{ type: CombinationKind; path: string }>) {
      state.uiSchema = setCombinationTypeReducer(state.uiSchema, action.payload);
    },
    addCombinationItem(
      state,
      action: PayloadAction<{ pointer: string; props: Partial<UiSchemaNode> }>
    ) {
      state.uiSchema = addCombinationItemReducer(state.uiSchema, {
        ...action.payload,
        callback: (newPointer: string) => {
          state.selectedEditorTab === 'definitions'
            ? (state.selectedDefinitionNodeId = newPointer)
            : (state.selectedPropertyNodeId = newPointer);
        }
      });
    },
    setJsonSchema(state, action: PayloadAction<{ schema: JSONSchema7 }>) {
      const { schema } = action.payload;
      state.schema = schema;
    },
    setPropertyName(
      state,
      action: PayloadAction<{ path: string; name: string; navigate?: boolean }>
    ) {
      const { path, navigate, name } = action.payload;
      state.uiSchema = setPropertyNameReducer(state.uiSchema, {
        path,
        name,
        callback: (newPointer: string) => {
          if (navigate) {
            state.selectedEditorTab === 'definitions'
              ? (state.selectedDefinitionNodeId = newPointer)
              : (state.selectedPropertyNodeId = newPointer);
          }
        }
      });
    },
    setSchemaName(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      state.name = name;
    },
    setSaveSchemaUrl(state, action: PayloadAction<{ saveUrl: string }>) {
      const { saveUrl } = action.payload;
      state.saveSchemaUrl = saveUrl;
    },
    setSelectedId(state, action: PayloadAction<{ pointer: string; focusName?: string }>) {
      const { pointer, focusName } = action.payload;
      state.focusNameField = focusName;
      const key =
        state.selectedEditorTab === 'definitions'
          ? 'selectedDefinitionNodeId'
          : 'selectedPropertyNodeId';
      Object.assign(state, {
        [key]: pointer,
      });
    },
    setUiSchema(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      state.uiSchema = buildUiSchema(state.schema);
      state.name = name;
      state.focusNameField = ROOT_POINTER;
      state.selectedDefinitionNodeId = ROOT_POINTER;
      state.selectedPropertyNodeId = ROOT_POINTER;
    },
    updateJsonSchema(state, action: PayloadAction<{ onSaveSchema?: (payload: any) => void }>) {
      const { onSaveSchema } = action.payload;
      const updatedSchema: JSONSchema7 = buildJsonSchema(state.uiSchema);
      state.schema = updatedSchema;
      if (onSaveSchema) {
        onSaveSchema(updatedSchema);
      }
    },
    setSelectedTab(state, action: PayloadAction<{ selectedTab: 'definitions' | 'properties' }>) {
      const { selectedTab } = action.payload;
      state.selectedEditorTab = selectedTab;
    },
    navigateToType(state, action: PayloadAction<{ pointer?: string }>) {
      const { pointer } = action.payload;
      if (pointer) {
        Object.assign(state, {
          selectedEditorTab: 'definitions',
          selectedDefinitionNodeId: pointer,
        });
      }
    },
    toggleArrayField(state, action: PayloadAction<{ pointer: string }>) {
      state.uiSchema = toggleArrayFieldReducer(state.uiSchema, action.payload.pointer);
    },
    changeChildrenOrder(state, action: PayloadAction<{ pointerA: string; pointerB: string }>) {
      state.uiSchema = changeChildrenOrderReducer(state.uiSchema, action.payload);
    },
  },
});

export const { reducer } = schemaEditorSlice;

export const {
  addCombinationItem,
  addEnum,
  addProperty,
  addRootItem,
  changeChildrenOrder,
  deleteCombinationItem,
  deleteEnum,
  deleteProperty,
  navigateToType,
  promoteProperty,
  setCombinationType,
  setDescription,
  setJsonSchema,
  setPropertyName,
  setRef,
  setRequired,
  setRestriction,
  setRestrictions,
  setSaveSchemaUrl,
  setSchemaName,
  setSelectedId,
  setSelectedTab,
  setTitle,
  setType,
  setUiSchema,
  toggleArrayField,
  updateJsonSchema,
} = schemaEditorSlice.actions;

export const SchemaEditorActions = schemaEditorSlice.actions;
