import { createSlice } from '@reduxjs/toolkit';
import { dataMock } from '../../mockData';
import { buildJsonSchema, buildUISchema, getUiSchemaItem } from '../../utils';

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

export enum ItemType {
  Property,
  Value,
  Ref,
};

export interface ISetValueAction {
  path: string,
  value: any,
  key?: string,
}

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    setValue(state, action) {
      let { path, value, key }: ISetValueAction = action.payload;
      console.log(`SET VALUE. path: ${path}, value: ${value}`);

      const itemType = path.includes('/properties/')
      ? ItemType.Property : (key ? ItemType.Value : ItemType.Ref);
      const schemaItem = getUiSchemaItem(state.uiSchema, path, itemType, key);
      schemaItem.value = value;
      
    },
    setKey(state, action) {
      let {path, oldKey, newKey} = action.payload;
      console.log(`SET KEY. path: ${path}, oldKey: ${oldKey}, newKey: ${newKey}`);

      const itemType = path.includes('/properties/') ? ItemType.Property : ItemType.Value;      
      const schemaItem = getUiSchemaItem(state.uiSchema, path, itemType, oldKey);
      schemaItem.key = newKey;
    },
    setUiSchema(state, action) {
      const rootElementPath = state.schema.properties.melding.$ref.substr(1);
      state.uiSchema =  buildUISchema(state.schema.definitions, '#/definitions');
      state.rootName = rootElementPath.replace('/definitions/', '');
    },
    setJsonSchema(state, action) {
      state.schema.definitions = buildJsonSchema(state.uiSchema).definitions;
      // console.log('TEST: ', test);
      // state.schema.definitions = test.definitions;
      // console.log(stringify(state.schema));
      // const http = new XMLHttpRequest();
      // const url = 'https://postman-echo.com/post';
      // http.open("POST", url);
      // http.send(JSON.stringify(state.schema));
    },
    addProperty(state, action) {
      console.log('ADD PROPERTY');
      const {path, newKey} = action.payload;
      const addToItem = state.uiSchema.find((item) => item.id === path);
      const itemToAdd = {
        id: `${path}/properties/${newKey}`,
        name: newKey,
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