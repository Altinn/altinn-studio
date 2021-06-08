/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';
import { buildJsonSchema, buildUISchema, getDomFriendlyID, getUiSchemaItem } from '../../utils';
import { ISchema, ISchemaState, ISetRefAction, ISetValueAction, UiSchemaItem } from '../../types';

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
    addRootProperty(state, action) {
      const { name } = action.payload;
      state.uiSchema.push(
        {
          id: `#/properties/${name}`,
          displayName: name,
          keywords: [
            { key: 'type', value: 'object' },
          ],
        },
      );
    },
    addProperty(state, action) {
      const { path } = action.payload;
      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const item: UiSchemaItem = {
        id: `${path}/properties/name`,
        displayName: 'name',
        keywords: [
          {
            key: 'type',
            value: 'object',
          },
        ],
      };
      if (addToItem.properties) {
        addToItem.properties.push(item);
      } else {
        addToItem.properties = [item];
      }
    },
    addRefProperty(state, action) {
      const {
        path, newKey, content,
      } = action.payload;

      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const item = content[0];
      const propertyItem: UiSchemaItem = {
        id: `${path}/properties/${newKey}`,
        displayName: newKey,
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
    deleteField(state, action) {
      const { path, key } = action.payload;
      const removeFromItem = getUiSchemaItem(state.uiSchema, path);
      if (removeFromItem) {
        const removeIndex = removeFromItem.keywords?.findIndex((v: any) => v.key === key) ?? -1;
        if (removeIndex >= 0) {
          removeFromItem.keywords?.splice(removeIndex, 1);
        }
      }
    },
    deleteProperty(state, action) {
      const path: string = action.payload.path;
      if (state.selectedId === path) {
        state.selectedId = undefined;
      }
      // eslint-disable-next-line no-useless-escape
      if (path.match('[^#]\/properties')) {
        // find parent of item to delete property.
        const index = path.lastIndexOf('/properties/');
        const parentPath = path.substring(0, index);
        const propertyName = path.substring(index + 12);
        const removeFromItem = getUiSchemaItem(state.uiSchema, parentPath);
        if (removeFromItem) {
          const removeIndex = removeFromItem
            .properties?.findIndex((property) => property.displayName === propertyName) ?? -1;
          if (removeIndex >= 0) {
            removeFromItem.properties?.splice(removeIndex, 1);
          }
        }
        return;
      }
      // delete root property / definition
      // if this is a definition, we need to find all references to this definition, and remove them (?)
      const rootIndex = state.uiSchema.findIndex((e: UiSchemaItem) => e.id === path);
      if (rootIndex >= 0) {
        state.uiSchema.splice(rootIndex, 1);
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
      const {
        path, name, navigate,
      } = action.payload;
      if (!name || name.length === 0) {
        return;
      }
      const item = getUiSchemaItem(state.uiSchema, path);
      if (item) {
        item.displayName = name;
        const arr = item.id.split('/');
        arr[arr.length - 1] = name;
        item.id = arr.join('/');
        if (navigate) {
          state.selectedId = item.id;
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

      const uiSchemaProps = buildUISchema(state.schema.properties, '#/properties', true);
      uiSchema = uiSchema.concat(uiSchemaProps);
      const uiSchemaDefs = buildUISchema(state.schema.definitions, '#/definitions', true);
      uiSchema = uiSchema.concat(uiSchemaDefs);

      state.uiSchema = uiSchema;
      state.rootName = rootElementPath;
    },
    updateJsonSchema(state, action) {
      const { onSaveSchema } = action.payload;
      const updatedSchema: ISchema = buildJsonSchema(state.uiSchema);
      if (!updatedSchema.definitions) {
        updatedSchema.definitions = {};
      }
      state.schema = updatedSchema;
      if (onSaveSchema) {
        onSaveSchema(updatedSchema);
      }
    },
  },
});

export const {
  addField,
  addRootProperty,
  addProperty,
  addRefProperty,
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
