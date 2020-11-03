import { createSlice } from '@reduxjs/toolkit';
import { stringify } from 'json5';
import { dataMock } from '../../mockData';
import { buildJsonSchema, createDataArray, getUiSchemaItem } from '../../utils';

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
      const { path, value } = action.payload;
      console.log(`SET VALUE. path: ${path}, value: ${value}`);

      const fullPath = path.startsWith('/') ? path.substr(1) : path;
      let pathArray = fullPath.split('/');
      const schemaItem = getUiSchemaItem(state.uiSchema, pathArray, 0);
      schemaItem.value = value;
    },
    setKey(state, action) {
      const {path, oldKey, newKey} = action.payload;
      console.log(`SET KEY. path: ${path}, oldKey: ${oldKey}, newKey: ${newKey}`);
      
      const fullPath = path.startsWith('/') ? path.substr(1) : path;
      let pathArray = fullPath.split('/');
      const schemaItem = getUiSchemaItem(state.uiSchema, pathArray, 0);
      schemaItem.id = newKey;
    },
    setUiSchema(state, action) {
      const rootElementPath = state.schema.properties.melding.$ref.substr(1);
      const rootElement = JsonPointer.get(state.schema, rootElementPath);
      state.uiSchema = createDataArray(rootElement, rootElementPath, '', state.schema);
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
    addItem(state, action) {
      console.log('ADD item');
      const {path, addAfter, newKey} = action.payload;
      const fullPath = path.startsWith('/') ? path.substr(1) : path;
      let pathArray = fullPath.split('/');
      const addToItem = getUiSchemaItem(state.uiSchema, pathArray, 0);
      const addAfterIndex = addToItem.value.findIndex((item: any) => item.id === addAfter);
      const newValues = addToItem.value.slice(0, addAfterIndex + 1)
        .concat([
          {
            id: newKey,
            uiPath: path,
            schemaPath: addToItem.value[addAfterIndex].schemaPath,
            value: []
          }
        ]).concat(addToItem.value.slice(addAfterIndex + 1));
      
        addToItem.value = newValues;
    },
    addProperty(state, action) {
      console.log('ADD PROPERTY');
      const {path, key, value} = action.payload;
      const fullPath = path.startsWith('/') ? path.substr(1) : path;
      let pathArray = fullPath.split('/');
      const addToItem = getUiSchemaItem(state.uiSchema, pathArray, 0);
      if (!addToItem.value) {
        addToItem.value = [];
      }

      addToItem.value.push({
        id: key,
        value,
        uiPath: path,
        schemaPath: `${addToItem.schemaPath}/${key}`,
      });
    }
  }
});

export const {
  addItem,
  addProperty,
  setJsonSchema,
  setKey,
  setValue,
  setUiSchema,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;