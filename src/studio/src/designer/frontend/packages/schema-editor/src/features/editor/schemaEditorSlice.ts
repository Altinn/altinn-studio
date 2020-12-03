import { createSlice } from '@reduxjs/toolkit';
import { buildJsonSchema, buildUISchema, getUiSchemaItem } from '../../utils';
import { ISchemaState, ISetValueAction, ItemType, UiSchemaItem } from '../../types';

const initialState: ISchemaState = {
  schema: {},
  uiSchema: [],
  rootName: '/',
  saveSchemaUrl: '',
}

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    addField(state, action) {
      const {path, key, value} = action.payload;
      const addToItem = state.uiSchema.find((item) => item.id === path);
      const itemToAdd = { key, value };
      if (addToItem.fields) {
        addToItem.fields.push(itemToAdd);
      } else {
        addToItem.fields = [itemToAdd];
      }
    },
    addProperty(state, action) {
      const {path, newKey, content} = action.payload;

      console.log('path: ', path);
      let addToItem = state.uiSchema.find((i) => i.id === path);
      const item = content[0];
      let propertyItem = {
        id: `${path}/properties/${newKey}`,
        name: newKey,
        $ref: item.id,
      };
      
      if (addToItem.properties) {
        addToItem.properties.push(propertyItem);
      } else {
        addToItem.properties = [propertyItem];
      }

      content.forEach((uiSchemaItem: UiSchemaItem) => {
        if (!state.uiSchema.find((i) => i.id === uiSchemaItem.id)) {
          state.uiSchema.push(uiSchemaItem);
        }
      });
    },
    addRootItem(state, action) {
      const { itemsToAdd } = action.payload;
      const rootItem = itemsToAdd[0];

      const baseItem = {
        id: '#/properties/melding',
        $ref: rootItem.id,
      };
      state.uiSchema.push(baseItem);

      itemsToAdd.forEach((item: UiSchemaItem) => {
        state.uiSchema.push(item);
      });

      state.rootName = rootItem.id;
    },
    deleteField(state, action) {
      const {path, key} = action.payload;
      const removeFromItem = state.uiSchema.find((item) => item.id === path);
      const removeIndex = removeFromItem.fields.findIndex((v: any) => v.key === key);
      const newValue = removeFromItem.fields.slice(0, removeIndex).concat(removeFromItem.fields.slice(removeIndex + 1));
      removeFromItem.fields = newValue;
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
    setFieldValue(state, action) {
      let { path, value, key }: ISetValueAction = action.payload;
      const itemType = path.includes('/properties/') ? ItemType.Property : (key ? ItemType.Value : ItemType.Ref);
      const schemaItem = getUiSchemaItem(state.uiSchema, path, itemType);
      if (schemaItem.fields) {
        const fieldItem = schemaItem.fields.find((field) => field.key === key);
        if (fieldItem) {
          fieldItem.value = value;
        }
      }
    },
    setKey(state, action) {
      let {path, oldKey, newKey} = action.payload;
      const itemType = path.includes('/properties/') ? ItemType.Property : ItemType.Value;      
      const schemaItem = getUiSchemaItem(state.uiSchema, path, itemType);
      if (schemaItem.fields) {
        const fieldItem = schemaItem.fields.find((field) => field.key === oldKey);
        if (fieldItem) {
          fieldItem.key = newKey;
        }
      }
    },
    setJsonSchema(state, action) {
      const {schema} = action.payload;
      state.schema = schema;
    },
    setPropertyName(state, action) {
      const {path, name} = action.payload;
      const [rootPath, propertyName] = path.split('/properties/');
      if (rootPath && propertyName) {
        const rootItem = state.uiSchema.find((item) => item.id === rootPath);
        const propertyItem = rootItem.properties.find((property: any) => property.name === propertyName);
        propertyItem.name = name;
        propertyItem.id = `${rootPath}/properties/${name}`;
      }
    },
    setRootName(state, action) {
      const { rootName } = action.payload;
      state.rootName = rootName;
    },
    setSaveSchemaUrl(state, action) {
      state.saveSchemaUrl = action.payload.saveUrl;
    },
    setUiSchema(state, action) {
      const { rootElementPath } = action.payload; // state.schema.properties.melding.$ref;
      let uiSchema: any[] = [];
      Object.keys(state.schema).forEach((key) => {
        const uiSchemaPart = buildUISchema(state.schema[key], `#/${key}`);
        uiSchema = uiSchema.concat(uiSchemaPart);
      })
      state.uiSchema =  uiSchema;
      state.rootName = rootElementPath;
    },
    updateJsonSchema(state, action) {
      const {onSaveSchema} = action.payload;
      const updatedSchema = buildJsonSchema(state.uiSchema);
      state.schema = updatedSchema;
      if (onSaveSchema) {
        onSaveSchema(updatedSchema);
      }
    }
  }
});

export const {
  addField,
  addProperty,
  addRootItem,
  deleteField,
  deleteProperty,
  setFieldValue,
  setKey,
  setJsonSchema,
  setPropertyName,
  setRootName,
  setSaveSchemaUrl,
  setUiSchema,
  updateJsonSchema,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;
