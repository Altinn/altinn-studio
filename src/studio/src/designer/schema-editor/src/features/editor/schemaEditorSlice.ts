import { createSlice } from '@reduxjs/toolkit';
import { stringify } from 'json5';
import { dataMock } from '../../mockData';
import { buildJsonSchema, buildUISchema, createDataArray, generateUiSchema, getUiSchemaItem } from '../../utils';

const JsonPointer = require('jsonpointer');

export interface ISchemaState {
  schema: any;
  uiSchema: any[];
  rootName: string;
}

const initialState: ISchemaState = {
  schema: dataMock,
  uiSchema: [],
  rootName: '/',
}

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    setValue(state, action) {
      const { path, value, key } = action.payload;
      console.log(`SET VALUE. path: ${path}, value: ${value}`);
      let schemaItem = state.uiSchema.find((item) => item.id === path);
      console.log('schema item: ', schemaItem);
      if (key) {
        schemaItem = schemaItem.value.find((item: any) => item.key === key);
      }
      schemaItem.value = value;
    },
    setKey(state, action) {
      const {path, oldKey, newKey} = action.payload;
      console.log(`SET KEY. path: ${path}, oldKey: ${oldKey}, newKey: ${newKey}`);
      
      let schemaItem = state.uiSchema.find((item) => item.id === path);
      if (schemaItem) {
        schemaItem = schemaItem.value.find((item: any) => item.key === oldKey);
        schemaItem.key = newKey;
      }
    },
    setUiSchema(state, action) {
      const rootElementPath = state.schema.properties.melding.$ref.substr(1);
      state.uiSchema =  buildUISchema(state.schema.definitions, '#/definitions');
      state.rootName = rootElementPath.replace('/definitions/', '');
    },
    setJsonSchema(state, action) {
      const test: any = {};
      buildJsonSchema(state.uiSchema, test);
      console.log('TEST: ', test);
      state.schema.definitions = test.definitions;
      console.log(stringify(state.schema));
      const http = new XMLHttpRequest();
      const url = 'https://postman-echo.com/post';
      http.open("POST", url);
      http.send(JSON.stringify(state.schema));
    },
    addProperty(state, action) {
      console.log('ADD PROPERTY');
      const {path, newKey} = action.payload;
      const addToItem = state.uiSchema.find((item) => item.id === path);
      const itemToAdd = {
        id: `${path}/properties/${newKey}`,
        displayText: newKey,
        $ref: `#/definitions/${newKey}`,
      };
      if (addToItem.properties) {
        addToItem.properties.push(itemToAdd);
      } else {
        addToItem.properties = [itemToAdd];
      }

      state.uiSchema.push({
        id: `#/definitions/${newKey}`,
      });
    },
    addField(state, action) {
      console.log('ADD FIELD');
      const {path, key, value} = action.payload;
      const addToItem = state.uiSchema.find((item) => item.id === path);
      const itemToAdd = { key, value };
      if (addToItem.value) {
        addToItem.value.push(itemToAdd);
      } else {
        addToItem.value = [itemToAdd];
      }
    }
  }
});

export const {
  addField,
  addProperty,
  setJsonSchema,
  setKey,
  setValue,
  setUiSchema,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;