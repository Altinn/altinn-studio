/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit';
import { buildJsonSchema, buildUISchema, getDomFriendlyID, getParentPath, getUiSchemaItem, getUniqueNumber } from '../../utils';
import { ISchema, ISchemaState, ISetRefAction, ISetTypeAction, ISetValueAction, UiSchemaItem } from '../../types';

export const initialState: ISchemaState = {
  schema: { properties: {}, definitions: {} },
  uiSchema: [],
  rootName: '/',
  saveSchemaUrl: '',
  selectedId: '',
  selectedNodeId: '',
  focusNameField: '',
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
      const itemToAdd = { key, value };
      if (addToItem.restrictions) {
        if (addToItem.restrictions.findIndex((f) => f.key === itemToAdd.key) > -1) {
          itemToAdd.key += getUniqueNumber();
        }
        addToItem.restrictions.push(itemToAdd);
      } else {
        addToItem.restrictions = [itemToAdd];
      }
    },
    addEnum(state, action) {
      const {
        path, value, oldValue,
      } = action.payload;

      const addToItem = getUiSchemaItem(state.uiSchema, path);
      if (!addToItem.enum) {
        addToItem.enum = [value];
        return;
      }
      if (!oldValue) {
        addToItem.enum.push(value);
        return;
      }
      const index = addToItem.enum.indexOf(oldValue);
      if (index >= -1) {
        addToItem.enum[index] = value;
      } else {
        addToItem.enum.push(value);
      }
    },
    addRootItem(state, action) {
      let { name } = action.payload;
      const { location } = action.payload;
      // make sure name is unique.
      if (state.uiSchema.findIndex((p) => p.displayName === name) > -1) {
        name += getUniqueNumber();
      }
      const path = `#/${location}/${name}`;
      state.uiSchema.push(
        {
          id: path,
          type: 'object',
          displayName: name,
        },
      );
      state.selectedId = path;
      state.selectedNodeId = getDomFriendlyID(path);
      state.focusNameField = path;
    },
    clearNameFocus(state) {
      state.focusNameField = undefined;
    },
    addProperty(state, action) {
      const { path, keepSelection } = action.payload;
      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const item: UiSchemaItem = {
        id: `${path}/properties/name`,
        displayName: 'name',
        type: 'object',
      };
      if (addToItem.properties) {
        if (addToItem.properties.findIndex((p) => p.id === item.id) > -1) {
          const number = getUniqueNumber();
          item.id += number;
          item.displayName += number;
        }
        addToItem.properties.push(item);
      } else {
        addToItem.properties = [item];
      }
      if (!keepSelection) {
        state.selectedId = item.id;
        state.selectedNodeId = getDomFriendlyID(item.id);
        state.focusNameField = item.id;
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
      const removeIndex = removeFromItem.restrictions?.findIndex((v: any) => v.key === key) ?? -1;
      if (removeIndex >= 0) {
        removeFromItem.restrictions?.splice(removeIndex, 1);
      }
    },
    deleteEnum(state, action) {
      const { path, value } = action.payload;
      const removeFromItem = getUiSchemaItem(state.uiSchema, path);
      const removeIndex = removeFromItem.enum?.findIndex((v: any) => v === value) ?? -1;
      if (removeIndex >= 0) {
        removeFromItem.enum?.splice(removeIndex, 1);
      }
    },
    promoteProperty(state, action) {
      // change property to be reference
      const path: string = action.payload.path;
      const item = getUiSchemaItem(state.uiSchema, path);

      // copy item and give new id
      const split = item.id.split('/');
      const name = split[split.length - 1];
      const copy = { ...item, id: `#/definitions/${name}` };
      state.uiSchema.push(copy);

      // create ref pointing to the new item
      const ref: UiSchemaItem = {
        id: path, $ref: copy.id, displayName: item.displayName,
      };
      // If this is a nested property,  we must add the ref to the properties array of the parent of the item
      // eslint-disable-next-line no-useless-escape
      if (path.match('[^#]\/properties')) {
        const index = path.lastIndexOf('/properties/');
        const parentPath = path.substring(0, index);
        const parent = getUiSchemaItem(state.uiSchema, parentPath);
        if (parent && parent.properties) {
          parent.properties.splice(parent.properties.findIndex((i) => i.id === path), 1); // removing original item
          parent.properties?.push(ref);
        }
      } else {
        // if this is a root property, we can just create a new rooot item with ref
        const rootIndex = state.uiSchema.findIndex((e: UiSchemaItem) => e.id === path); // remove original item
        if (rootIndex >= 0) {
          state.uiSchema.splice(rootIndex, 1);
        }
        state.uiSchema.push(ref);
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
    setRestrictionKey(state, action) {
      const {
        path, oldKey, newKey,
      } = action.payload;
      if (oldKey === newKey) {
        return;
      }
      let key = newKey;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem.restrictions) {
        if (schemaItem.restrictions.findIndex((f) => f.key === key) > -1) {
          key += getUniqueNumber();
        }
        const fieldItem = schemaItem.restrictions.find((field) => field.key === oldKey);
        if (fieldItem) {
          fieldItem.key = key;
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
          state.selectedNodeId = getDomFriendlyID(item.id);
        }
      }
    },
    setRootName(state, action) {
      const { rootName } = action.payload;
      state.rootName = rootName;
    },
    setSelectedId(state, action) {
      const {
        id, navigate, focusName,
      } = action.payload;
      state.selectedId = id;
      state.selectedNodeId = getDomFriendlyID(id);
      state.focusNameField = focusName;
      state.navigate = navigate;
    },
    setSaveSchemaUrl(state, action) {
      state.saveSchemaUrl = action.payload.saveUrl;
    },
    setUiSchema(state, action) {
      const { rootElementPath } = action.payload;
      let uiSchema: any[] = [];

      const uiSchemaProps = buildUISchema(state.schema.properties, '#/properties', true);
      uiSchema = uiSchema.concat(uiSchemaProps);
      const uiSchemaDefs = buildUISchema(state.schema.definitions, '#/definitions', true);
      uiSchema = uiSchema.concat(uiSchemaDefs);

      state.uiSchema = uiSchema;
      state.rootName = rootElementPath;

      // set first item as selected
      if (state.uiSchema.length > 0) {
        const id = state.uiSchema[0].id;
        state.selectedId = id;
        state.selectedNodeId = getDomFriendlyID(id);
        state.focusNameField = id;
      }
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
  addEnum,
  addRootItem,
  addProperty,
  clearNameFocus,
  addRefProperty,
  deleteField,
  deleteEnum,
  deleteProperty,
  promoteProperty,
  setRestriction,
  setRestrictionKey,
  setRef,
  setItems,
  setJsonSchema,
  setPropertyName,
  setRootName,
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
