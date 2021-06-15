/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';
import { buildJsonSchema, buildUISchema, getDomFriendlyID, getParentPath, getUiSchemaItem } from '../../utils';
import { ISchema, ISchemaState, ISetRefAction, ISetTypeAction, ISetValueAction, UiSchemaItem } from '../../types';

export const initialState: ISchemaState = {
  schema: { properties: {}, definitions: {} },
  uiSchema: [],
  name: '/',
  saveSchemaUrl: '',
  selectedId: '',
  selectedNodeId: '',
};

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    addRestriction(state, action) {
      const {
        path, value, key,
      } = action.payload;

      const addToItem = getUiSchemaItem(state.uiSchema, path);
      if (addToItem) {
        const itemToAdd = { key, value };
        if (addToItem.restrictions) {
          while (addToItem.restrictions.findIndex((f) => f.key === itemToAdd.key) > -1) {
            itemToAdd.key += 1;
          }
          addToItem.restrictions.push(itemToAdd);
        } else {
          addToItem.restrictions = [itemToAdd];
        }
      }
    },
    addRootProperty(state, action) {
      const { name } = action.payload;
      state.uiSchema.push(
        {
          id: `#/properties/${name}`,
          type: 'object',
          displayName: name,
        },
      );
    },
    addRootDefinition(state, action) {
      const { name } = action.payload;
      state.uiSchema.push(
        {
          id: `#/definitions/${name}`,
          type: 'object',
          displayName: name,
        },
      );
    },
    addProperty(state, action) {
      const { path } = action.payload;
      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const item: UiSchemaItem = {
        id: `${path}/properties/name`,
        displayName: 'name',
        type: 'object',
      };
      if (addToItem.properties) {
        while (addToItem.properties.findIndex((p) => p.id === item.id) > -1) {
          item.id += 1;
          item.displayName += 1;
        }
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
        const removeIndex = removeFromItem.restrictions?.findIndex((v: any) => v.key === key) ?? -1;
        if (removeIndex >= 0) {
          removeFromItem.restrictions?.splice(removeIndex, 1);
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
    setRestriction(state, action) {
      const {
        path, value, key,
      }: ISetValueAction = action.payload;
      // eslint-disable-next-line no-nested-ternary
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (!schemaItem.restrictions) {
        schemaItem.restrictions = [];
      }

      const fieldItem = schemaItem.restrictions.find((field) => field.key === key);
      if (fieldItem) {
        fieldItem.value = value;
      } else if (key) {
        schemaItem.restrictions.push({ key, value });
      }
    },
    setItems(state, action) {
      const {
        path, items,
      } = action.payload;
      // eslint-disable-next-line no-nested-ternary
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.items = items;
    },
    setRef(state, action) {
      const {
        path, ref,
      }: ISetRefAction = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem) {
        schemaItem.$ref = ref;
        schemaItem.type = undefined;
      }
    },
    setKey(state, action) {
      const {
        path, oldKey, newKey,
      } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem.restrictions) {
        const fieldItem = schemaItem.restrictions.find((field) => field.key === oldKey);
        if (fieldItem) {
          fieldItem.key = newKey;
        }
      }
    },
    setType(state, action) {
      const { path, value }: ISetTypeAction = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.$ref = undefined;
      schemaItem.type = value;
    },
    setTitle(state, action) {
      const { path, title } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.title = title;
    },
    setDescription(state, action) {
      const { path, description } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.description = description;
    },
    setRequired(state, action) {
      const {
        path, key, required,
      } = action.payload;
      // need to find parent object
      const parent = getParentPath(path);
      if (parent != null) {
        const schemaItem = getUiSchemaItem(state.uiSchema, parent);
        if (schemaItem.required === undefined) {
          schemaItem.required = [];
        }
        if (!required) {
          schemaItem.required = schemaItem.required.filter((k) => k !== key);
        } else if (!schemaItem.required.includes(key)) {
          schemaItem.required.push(key);
        }
      }
    },
    setJsonSchema(state, action) {
      const { schema } = action.payload;
      state.selectedId = undefined;
      state.selectedNodeId = undefined;
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
    setSchemaName(state, action) {
      const { name } = action.payload;
      state.name = name;
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
      const { name } = action.payload;
      let uiSchema: any[] = [];

      const uiSchemaProps = buildUISchema(state.schema.properties, '#/properties', true);
      uiSchema = uiSchema.concat(uiSchemaProps);
      const uiSchemaDefs = buildUISchema(state.schema.definitions, '#/definitions', true);
      uiSchema = uiSchema.concat(uiSchemaDefs);

      state.uiSchema = uiSchema;
      state.name = name;
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
  addRestriction,
  addRootProperty,
  addRootDefinition,
  addProperty,
  addRefProperty,
  deleteField,
  deleteProperty,
  setRestriction,
  setKey,
  setRef,
  setItems,
  setJsonSchema,
  setPropertyName,
  setSchemaName,
  setSaveSchemaUrl,
  setUiSchema,
  updateJsonSchema,
  setSelectedId,
  setTitle,
  setDescription,
  setType,
  setRequired,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;
