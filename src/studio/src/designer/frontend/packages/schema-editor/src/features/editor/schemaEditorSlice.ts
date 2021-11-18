/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { buildJsonSchema, buildUISchema, splitParentPathAndName, getUiSchemaItem, getUniqueNumber, mapCombinationChildren } from '../../utils';
import { CombinationKind, FieldType, ISchema, ISchemaState, UiSchemaItem } from '../../types';

export const initialState: ISchemaState = {
  schema: { properties: {}, definitions: {} },
  uiSchema: [],
  name: '/',
  saveSchemaUrl: '',
  selectedPropertyNodeId: '',
  selectedDefinitionNodeId: '',
  focusNameField: '',
  selectedEditorTab: 'properties',
};

const updateChildPaths = (item: UiSchemaItem, parentId: string) => {
  item.path = `${parentId}/properties/${item.displayName}`;
  if (item.properties) {
    item.properties.forEach((p) => updateChildPaths(p, item.path));
  }
};

const schemaEditorSlice = createSlice({
  name: 'schemaEditor',
  initialState,
  reducers: {
    addRestriction(state, action: PayloadAction<{ path: string, value: string, key: string }>) {
      const {
        path, value, key,
      } = action.payload;

      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const itemToAdd = { key, value };
      if (addToItem.restrictions) {
        if (addToItem.restrictions.findIndex((f) => f.key === itemToAdd.key) !== -1) {
          itemToAdd.key += getUniqueNumber();
        }
        addToItem.restrictions.push(itemToAdd);
      } else {
        addToItem.restrictions = [itemToAdd];
      }
    },
    addEnum(state, action: PayloadAction<{ path: string, value: string, oldValue?: string }>) {
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
    addRootItem(state, action: PayloadAction<{ location: string, name: string, props: Partial<UiSchemaItem> }>) {
      const {
        location, name, props
      } = action.payload;
      // make sure name is unique.
      let displayName = name;
      if (state.uiSchema.findIndex((p) => p.displayName === displayName) !== -1) {
        displayName += getUniqueNumber();
      }
      const path = `#/${location}/${displayName}`;
      state.uiSchema.push(
        {
          ...props,
          path,
          displayName,
        },
      );
      if (location === 'definitions') {
        state.selectedDefinitionNodeId = path;
      } else {
        state.selectedPropertyNodeId = path;
      }
      state.focusNameField = path;
    },
    clearNameFocus(state) {
      state.focusNameField = undefined;
    },
    addProperty(state, action: PayloadAction<{ path: string, keepSelection?: boolean, props?: Partial<UiSchemaItem> }>) {
      const {
        path, keepSelection, props
      } = action.payload;
      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const item: UiSchemaItem = {
        ...props,
        path: `${path}/properties/name`,
        displayName: 'name',
      };
      if (addToItem.properties) {
        if (addToItem.properties.findIndex((p) => p.path === item.path) !== -1) {
          const number = getUniqueNumber();
          item.path += number;
          item.displayName += number;
        }
        addToItem.properties.push(item);
      } else {
        addToItem.properties = [item];
      }
      if (!keepSelection) {
        if (state.selectedEditorTab === 'definitions') {
          // triggered from definitions view
          state.selectedDefinitionNodeId = item.path;
        } else {
          // triggered from properties view
          state.selectedPropertyNodeId = item.path;
        }
        state.focusNameField = item.path;
      }
    },
    deleteField(state, action: PayloadAction<{ path: string, key: string }>) {
      const { path, key } = action.payload;
      const removeFromItem = getUiSchemaItem(state.uiSchema, path);
      const removeIndex = removeFromItem.restrictions?.findIndex((v: any) => v.key === key) ?? -1;
      if (removeIndex >= 0) {
        removeFromItem.restrictions?.splice(removeIndex, 1);
      }
    },
    deleteEnum(state, action: PayloadAction<{ path: string, value: string }>) {
      const { path, value } = action.payload;
      const removeFromItem = getUiSchemaItem(state.uiSchema, path);
      const removeIndex = removeFromItem.enum?.findIndex((v: any) => v === value) ?? -1;
      if (removeIndex >= 0) {
        removeFromItem.enum?.splice(removeIndex, 1);
      }
    },
    promoteProperty(state, action: PayloadAction<{ path: string }>) {
      // change property to be reference
      const path: string = action.payload.path;
      const item = getUiSchemaItem(state.uiSchema, path);

      // copy item and give new id
      const split = item.path.split('/');
      const name = split[split.length - 1];
      const copy = { ...item, path: `#/definitions/${name}` };
      state.uiSchema.push(copy);

      // create ref pointing to the new item
      const ref: UiSchemaItem = {
        path, $ref: copy.path, displayName: item.displayName,
      };
      // If this is a nested property,  we must add the ref to the properties array of the parent of the item
      const [parentPath] = splitParentPathAndName(path);
      if (parentPath != null) {
        const parent = getUiSchemaItem(state.uiSchema, parentPath);
        if (parent && parent.properties) {
          parent.properties.splice(parent.properties.findIndex((i) => i.path === path), 1); // removing original item
          parent.properties?.push(ref);
        }
      } else {
        // if this is a root property, we can just create a new rooot item with ref
        const rootIndex = state.uiSchema.findIndex((e: UiSchemaItem) => e.path === path); // remove original item
        if (rootIndex >= 0) {
          state.uiSchema.splice(rootIndex, 1);
        }
        state.uiSchema.push(ref);
      }
    },
    deleteProperty(state, action: PayloadAction<{ path: string }>) {
      const path: string = action.payload.path;
      if (state.selectedDefinitionNodeId === path) {
        state.selectedDefinitionNodeId = '';
      } else if (state.selectedPropertyNodeId === path) {
        state.selectedPropertyNodeId = '';
      }
      const [parentPath, propertyName] = splitParentPathAndName(path);
      if (parentPath) {
        const removeFromItem = getUiSchemaItem(state.uiSchema, parentPath);
        if (removeFromItem && propertyName) {
          if (removeFromItem.properties) {
            // removing a object (foo.bar)
            const removeIndex = removeFromItem
              .properties?.findIndex((property) => property.displayName === propertyName) ?? -1;
            if (removeIndex >= 0) {
              removeFromItem.properties?.splice(removeIndex, 1);
            }
          }
        }
        return;
      }
      // delete root property / definition
      // if this is a definition, we need to find all references to this definition, and remove them (?)
      const rootIndex = state.uiSchema.findIndex((e: UiSchemaItem) => e.path === path);
      if (rootIndex >= 0) {
        state.uiSchema.splice(rootIndex, 1);
      }
    },
    deleteCombinationItem(state, action: PayloadAction<{ path: string }>) {
      // removing a "combination" array item (foo.anyOf[i]), could be oneOf, allOf, anyOf
      const path: string = action.payload.path;
      if (state.selectedDefinitionNodeId === path) {
        state.selectedDefinitionNodeId = '';
      } else if (state.selectedPropertyNodeId === path) {
        state.selectedPropertyNodeId = '';
      }
      const [parentPath, propertyName] = splitParentPathAndName(path);
      if (parentPath) {
        const removeFromItem = getUiSchemaItem(state.uiSchema, parentPath);
        if (removeFromItem && propertyName) {
          const children = removeFromItem.combination;
          const index = parseInt(propertyName, 10);
          if (children) {
            children.splice(index, 1);
            // shift child item paths if necessary
            for (let i = index; i < children.length; i += 1) {
              const splitChildPath = children[i].path.split('/');
              splitChildPath[splitChildPath.length - 1] = i.toString();
              children[i].path = splitChildPath.join('/');
            }
          }
        }
      }
    },
    setRestriction(state, action: PayloadAction<{ path: string, value: string, key: string }>) {
      const {
        path, value, key,
      } = action.payload;
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
    setItems(state, action: PayloadAction<{ path: string, items?: { type?: string, $ref?: string } }>) {
      const {
        path, items,
      } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.items = items;
    },
    setRef(state, action: PayloadAction<{ path: string, ref: string }>) {
      const {
        path, ref,
      } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      if (schemaItem) {
        schemaItem.$ref = ref;
        schemaItem.type = undefined;
      }
    },
    setRestrictionKey(state, action: PayloadAction<{ path: string, oldKey: string, newKey: string }>) {
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
    setType(state, action: PayloadAction<{ path: string, type: FieldType }>) {
      const { path, type } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.$ref = undefined;
      if (type === 'array') {
        schemaItem.properties = undefined;
      }
      schemaItem.type = type;
    },
    setTitle(state, action: PayloadAction<{ path: string, title: string }>) {
      const { path, title } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.title = title;
    },
    setDescription(state, action: PayloadAction<{ path: string, description: string }>) {
      const { path, description } = action.payload;
      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.description = description;
    },
    setRequired(state, action: PayloadAction<{ path: string, key: string, required: boolean }>) {
      const {
        path, key, required,
      } = action.payload;
      // need to find parent object
      const [parent] = splitParentPathAndName(path);
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
    setCombinationType(state, action: PayloadAction<{ type: CombinationKind, path: string }>) {
      const {
        type,
        path,
      } = action.payload;

      const schemaItem = getUiSchemaItem(state.uiSchema, path);
      schemaItem.combinationKind = type;
      schemaItem.combination = mapCombinationChildren(schemaItem.combination || [], type);
    },
    addCombinationItem(state, action: PayloadAction<{ path: string, props: Partial<UiSchemaItem> }>) {
      const { path, props } = action.payload;
      const addToItem = getUiSchemaItem(state.uiSchema, path);
      const item: UiSchemaItem = {
        ...props,
        displayName: (props.$ref !== undefined) ? 'ref' : '',
        path: `${path}/${addToItem.combinationKind}/${addToItem.combination?.length}`,
        combinationItem: true,
      };
      addToItem.combination?.push(item);
    },
    setJsonSchema(state, action) {
      const { schema } = action.payload;
      state.schema = schema;
    },
    setPropertyName(state, action: PayloadAction<{ path: string, name: string, navigate?: string }>) {
      const {
        path, navigate,
      } = action.payload;
      let name = action.payload.name;
      if (!name || name.length === 0) {
        return;
      }

      // make sure property name is unique
      const [parentPath] = splitParentPathAndName(path);
      if (parentPath) {
        const parent = getUiSchemaItem(state.uiSchema, parentPath);
        if (parent.properties) {
          if (parent.properties.findIndex((p) => p.displayName === name) !== -1) {
            name += getUniqueNumber();
          }
        }
      }
      const item = getUiSchemaItem(state.uiSchema, path);
      if (item) {
        item.displayName = name;
        const arr = item.path.split('/');
        arr[arr.length - 1] = name;
        item.path = arr.join('/');

        // if item has properties, we must update child paths as well.
        if (item.properties) {
          item.properties.forEach((p) => updateChildPaths(p, item.path));
        }

        // if item has combinations, we must update child paths as well
        if (item.combination) {
          item.combination.forEach((c) => {
            c.path = c.path.replace(path, item.path);
          });
        }

        if (navigate) {
          if (state.selectedEditorTab === 'definitions') {
            // triggered from definitions view
            state.selectedDefinitionNodeId = item.path;
          } else {
            // triggered from properties view
            state.selectedPropertyNodeId = item.path;
          }
        }
      }
    },
    setSchemaName(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      state.name = name;
    },
    setSelectedId(state, action: PayloadAction<{ id: string, focusName?: string }>) {
      const {
        id, focusName,
      } = action.payload;
      state.focusNameField = focusName;
      if (state.selectedEditorTab === 'definitions') {
        // triggered from definitions view
        state.selectedDefinitionNodeId = id;
      } else {
        // triggered from properties view
        state.selectedPropertyNodeId = id;
      }
    },
    setSaveSchemaUrl(state, action: PayloadAction<{ saveUrl: string }>) {
      state.saveSchemaUrl = action.payload.saveUrl;
    },
    setUiSchema(state, action: PayloadAction<{ name: string }>) {
      const { name } = action.payload;
      let uiSchema: any[] = [];

      const uiSchemaProps = buildUISchema(state.schema.properties, '#/properties', true);
      uiSchema = uiSchema.concat(uiSchemaProps);
      const uiSchemaDefs = buildUISchema(state.schema.definitions, '#/definitions', true);
      uiSchema = uiSchema.concat(uiSchemaDefs);

      state.uiSchema = uiSchema;
      state.name = name;

      // reset state if switching between schemas
      state.selectedPropertyNodeId = '';
      state.selectedDefinitionNodeId = '';

      // set first item as selected
      if (state.uiSchema.length > 0) {
        const id = state.uiSchema[0].path;
        state.focusNameField = id;
        if (id.startsWith('#/definitions')) {
          state.selectedDefinitionNodeId = id;
        } else {
          state.selectedPropertyNodeId = id;
        }
      }
    },
    updateJsonSchema(state, action: PayloadAction<{ onSaveSchema: (payload: any) => void }>) {
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
    setSelectedTab(state, action: PayloadAction<{ selectedTab: 'definitions' | 'properties' }>) {
      const { selectedTab } = action.payload;
      state.selectedEditorTab = selectedTab;
    },
    navigateToType(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload;
      state.selectedEditorTab = 'definitions';
      state.selectedDefinitionNodeId = id;
    },
  },
});

export const {
  addRestriction,
  addEnum,
  addRootItem,
  addProperty,
  addCombinationItem,
  clearNameFocus,
  deleteField,
  deleteEnum,
  deleteProperty,
  deleteCombinationItem,
  promoteProperty,
  setRestriction,
  setRestrictionKey,
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
  setCombinationType,
  setSelectedTab,
  navigateToType,
} = schemaEditorSlice.actions;

export default schemaEditorSlice.reducer;
