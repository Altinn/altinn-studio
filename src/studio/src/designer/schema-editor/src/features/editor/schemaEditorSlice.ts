import { createSlice } from '@reduxjs/toolkit';
import { dataMock } from '../../mockData';
import { buildJsonSchema, buildUISchema, getUiSchemaItem } from '../../utils';
import { put } from '../../networking';

export interface ISchemaState {
  schema: any;
  uiSchema: any[];
  rootName: string;
  saveSchemaUrl: string;
}

const initialState: ISchemaState = {
  schema: dataMock,
  uiSchema: [],
  rootName: '/',
  saveSchemaUrl: '',
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
    setSaveSchemaUrl(state, action) {
      state.saveSchemaUrl = action.payload.saveUrl;
    },
    setJsonSchema(state, action) {
      state.schema.definitions = buildJsonSchema(state.uiSchema).definitions;
      console.log('save url: ', state.saveSchemaUrl);
      if (state.saveSchemaUrl) {
        put(state.saveSchemaUrl, state.schema);
      }
      
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
    },
    deleteProperty(state, action) {
      const {path} = action.payload;
      const [rootPath, propertyName] = path.split('/properties/');
      if (rootPath && propertyName) {
        const removeFromItem = state.uiSchema.find((item) => item.id === rootPath);
        const removeIndex = removeFromItem.properties.findIndex((property: any) => property.name === propertyName);
        const newProperties = removeFromItem.properties.slice(0, removeIndex).concat(removeFromItem.properties.slice(removeIndex + 1));
        removeFromItem.properties = newProperties;
      }
    },
    setPropertyName(state, action) {
      console.log('SET PROPERTY NAME');
      const {path, name} = action.payload;
      const [rootPath, propertyName] = path.split('/properties/');
      if (rootPath && propertyName) {
        const rootItem = state.uiSchema.find((item) => item.id === rootPath);
        const propertyItem = rootItem.properties.find((property: any) => property.name === propertyName);
        propertyItem.name = name;
        propertyItem.id = `${rootPath}/properties/${name}`;
      }
    }
  }
});

export const {
  addField,
  addProperty,
  deleteProperty,
  setJsonSchema,
  setKey,
  setPropertyName,
  setSaveSchemaUrl,
  setValue,
  setUiSchema,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;