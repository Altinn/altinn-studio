import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { SchemaState } from '../../types';
import { pointerIsDefinition, ROOT_POINTER } from '@altinn/schema-model';

export const initialState: SchemaState = {
  name: '/',
  selectedPropertyNodeId: '',
  selectedDefinitionNodeId: '',
  focusNameField: '',
  selectedEditorTab: 'properties',
};

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    setSelectedAndFocusedNode(state, { payload: newPointer }: PayloadAction<string>) {
      if (pointerIsDefinition(newPointer)) state.selectedDefinitionNodeId = newPointer;
      else state.selectedPropertyNodeId = newPointer;
      state.focusNameField = newPointer;
    },
    removeSelection(state, { payload: path }: PayloadAction<string>) {
      if (state.selectedDefinitionNodeId === path) {
        state.selectedDefinitionNodeId = '';
      } else if (state.selectedPropertyNodeId === path) {
        state.selectedPropertyNodeId = '';
      }
    },
    setSelectedNode(state, { payload: newPointer }: PayloadAction<string>) {
      state.selectedEditorTab === 'definitions'
        ? (state.selectedDefinitionNodeId = newPointer)
        : (state.selectedPropertyNodeId = newPointer);
    },
    setSchemaName(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      state.name = name;
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
      state.name = name;
      state.focusNameField = ROOT_POINTER;
      state.selectedDefinitionNodeId = ROOT_POINTER;
      state.selectedPropertyNodeId = ROOT_POINTER;
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
  },
});

export const { reducer } = schemaEditorSlice;

export const {
  navigateToType,
  removeSelection,
  setSchemaName,
  setSelectedAndFocusedNode,
  setSelectedId,
  setSelectedNode,
  setSelectedTab,
  setUiSchema,
} = schemaEditorSlice.actions;

export const SchemaEditorActions = schemaEditorSlice.actions;
