/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';
import { buildJsonSchema, buildUISchema, getDomFriendlyID, getUiSchemaItem } from '../../utils';
import { ISchemaState, ISetRefAction, ISetValueAction, UiSchemaItem } from '../../types';

export const initialState: ISchemaState = {
  schema: { properties: {}, definitions: {} },
  uiSchema: [],
  rootName: '/',
  saveSchemaUrl: '',
  selectedId: '',
  selectedNodeId: '',
};

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    addField(state, action) {
      const {
        path, key, value,
      } = action.payload;

      const addToItem = getUiSchemaItem(state.uiSchema, path);
      if (addToItem) {
        const itemToAdd = { key, value };
        if (addToItem.keywords) {
          addToItem.keywords.push(itemToAdd);
        } else {
          addToItem.keywords = [itemToAdd];
        }
      }
    },
    addProperty(state, action) {
      const {
        path, newKey, content,
      } = action.payload;

      const addToItem = state.uiSchema.find((i) => i.id === path);
      const item = content[0];
      const propertyItem = {
        id: `${path}/properties/${newKey}`,
        name: newKey,
        $ref: item.id,
      };

      if (addToItem && addToItem.properties) {
        addToItem.properties.push(propertyItem);
      } else if (addToItem) {
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
      const { path, key } = action.payload;
      const removeFromItem = getUiSchemaItem(state.uiSchema, path);
      if (removeFromItem) {
        const removeIndex = removeFromItem.keywords?.findIndex((v: any) => v.key === key) ?? -1;
        const newValue = removeFromItem
          .keywords?.slice(0, removeIndex).concat(removeFromItem.keywords.slice(removeIndex + 1));
        removeFromItem.keywords = newValue;
      }
    },
    deleteProperty(state, action) {
      const { path } = action.payload;
      const [rootPath, propertyName] = path.split('/properties/');
      if (rootPath && propertyName) {
        const removeFromItem = state.uiSchema.find((item) => item.id === rootPath);
        if (removeFromItem) {
          const removeIndex = removeFromItem
            .properties?.findIndex((property: any) => property.name === propertyName) ?? -1;
          const newProperties = removeFromItem
            .properties?.slice(0, removeIndex).concat(removeFromItem.properties.slice(removeIndex + 1));
          removeFromItem.properties = newProperties;
        }
      }
    },
    setFieldValue(state, action) {
      const {
        path, value, key,
      }: ISetValueAction = action.payload;
      // eslint-disable-next-line no-nested-ternary
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem.keywords) {
        const fieldItem = schemaItem.keywords.find((field) => field.key === key);
        if (fieldItem) {
          fieldItem.value = value;
        }
      }
    },
    setRef(state, action) {
      const {
        path, ref,
      }: ISetRefAction = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem) {
        schemaItem.$ref = ref;
      }
    },
    setKey(state, action) {
      const {
        path, oldKey, newKey,
      } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem.keywords) {
        const fieldItem = schemaItem.keywords.find((field) => field.key === oldKey);
        if (fieldItem) {
          fieldItem.key = newKey;
        }
      }
    },
    setJsonSchema(state, action) {
      const { schema } = action.payload;
      state.schema = schema;
    },
    setPropertyName(state, action) {
      const { path, name } = action.payload;
      if (path.includes('/properties')) {
        // #/definitions/Foretak/properties/organisasjonsnummerForetak
        const [rootPath, propertyName] = path.split('/properties/');
        if (rootPath && propertyName) {
          const rootItem = state.uiSchema.find((item) => item.id === rootPath);
          const propertyItem = rootItem?.properties?.find((property: any) => property.name === propertyName);
          if (propertyItem) {
            propertyItem.name = name;
            propertyItem.id = `${rootPath}/properties/${name}`;
            state.selectedId = propertyItem.id;
          }
        }
        // also update definition item ?
      } else if (path.includes('/definitions')) {
        // just update definition id/name
        const propertyName = path.split('/definitions/')[1];
        if (propertyName) {
          const rootItem = state.uiSchema.find((item) => item.id === path);
          if (rootItem) {
            rootItem.name = name;
            rootItem.id = `#/definitions/${propertyName}`;
            state.selectedId = rootItem.id;
          }
        }
      }
    },
    setRootName(state, action) {
      const { rootName } = action.payload;
      state.rootName = rootName;
    },
    setSelectedId(state, action) {
      const {
        id, navigate,
      } = action.payload;
      state.selectedId = id;
      state.selectedNodeId = navigate ? getDomFriendlyID(id) : undefined;
    },
    setSaveSchemaUrl(state, action) {
      state.saveSchemaUrl = action.payload.saveUrl;
    },
    setUiSchema(state, action) {
      const { rootElementPath } = action.payload; // state.schema.properties.melding.$ref;
      let uiSchema: any[] = [];

      const uiSchemaProps = buildUISchema(state.schema.properties, '#/properties');
      uiSchema = uiSchema.concat(uiSchemaProps);
      const uiSchemaDefs = buildUISchema(state.schema.definitions, '#/definitions');
      uiSchema = uiSchema.concat(uiSchemaDefs);

      state.uiSchema = uiSchema;
      state.rootName = rootElementPath;
    },
    updateJsonSchema(state, action) {
      const { onSaveSchema } = action.payload;
      const updatedSchema = buildJsonSchema(state.uiSchema);
      state.schema = updatedSchema;
      if (onSaveSchema) {
        onSaveSchema(updatedSchema);
      }
    },
  },
});

export const {
  addField,
  addProperty,
  addRootItem,
  deleteField,
  deleteProperty,
  setFieldValue,
  setKey,
  setRef,
  setJsonSchema,
  setPropertyName,
  setRootName,
  setSaveSchemaUrl,
  setUiSchema,
  updateJsonSchema,
  setSelectedId,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;
