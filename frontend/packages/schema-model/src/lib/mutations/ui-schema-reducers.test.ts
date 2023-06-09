import {
  addCombinationItem,
  addEnumValue,
  addProperty,
  addRootItem,
  changeChildrenOrder,
  deleteEnumValue,
  deleteNode,
  promoteProperty,
  setCombinationType,
  setDescription,
  setPropertyName,
  setRef,
  setRequired,
  setRestriction,
  setRestrictions,
  setTitle,
  setType,
  toggleArrayField,
} from './ui-schema-reducers';
import type {
  AddCombinationItemArgs,
  AddEnumValueArgs,
  AddPropertyArgs,
  AddRootItemArgs,
  ChangeChildrenOrderArgs,
  DeleteEnumValueArgs,
  SetCombinationTypeArgs,
  SetDescriptionArgs,
  SetPropertyNameArgs,
  SetRefArgs,
  SetRestrictionArgs,
  SetRestrictionsArgs,
  SetTitleArgs,
  SetTypeArgs,
} from './ui-schema-reducers';
import {
  allOfNodeMock,
  arrayNodeMock,
  defNodeMock,
  enumNodeMock,
  numberNodeMock,
  optionalNodeMock,
  parentNodeMock,
  requiredNodeMock,
  stringNodeMock,
  uiSchemaMock,
} from '../../../test/uiSchemaMock';
import { getChildNodesByPointer, getNodeByPointer } from '../selectors';
import { expect } from '@jest/globals';
import { CombinationKind, FieldType, Keyword, ObjectKind, StrRestrictionKey, UiSchemaNode } from '../../types';
import { ROOT_POINTER } from '../constants';
import { getPointers } from '../mappers/getPointers';
import { substringAfterLast, substringBeforeLast } from 'app-shared/utils/stringUtils';

describe('ui-schema-reducers', () => {
  afterEach(jest.clearAllMocks);

  describe('addEnumValue', () => {
    const { pointer } = enumNodeMock;
    const value = 'val4';

    it('Adds an enum value to the given node if oldValue is not given', () => {
      const args: AddEnumValueArgs = { path: pointer, value };
      const result = addEnumValue(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.enum).toEqual([...enumNodeMock.enum, value]);
    });

    it('Adds an enum value to the given node if oldValue does not exist', () => {
      const oldValue = 'val5';
      const args: AddEnumValueArgs = { path: pointer, value, oldValue };
      const result = addEnumValue(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.enum).toEqual([...enumNodeMock.enum, value]);
    });

    it('Replaces oldValue if it exists', () => {
      const oldValue = enumNodeMock.enum[0];
      const args: AddEnumValueArgs = { path: pointer, value, oldValue };
      const result = addEnumValue(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.enum).toEqual([value, ...enumNodeMock.enum.slice(1)]);
    });
  });

  describe('addRootItem', () => {
    const location = `${ROOT_POINTER}/defs`;
    const name = 'testname';
    const props: Partial<UiSchemaNode> = { fieldType: FieldType.Object };
    const callback = jest.fn();
    const args: AddRootItemArgs = { location, name, props, callback };
    const expectedPointer = `${location}/${name}`;

    it('Adds an item to the root node', () => {
      const result = addRootItem(uiSchemaMock, args);
      expect(getPointers(result)).toContain(expectedPointer);
      expect(getNodeByPointer(result, ROOT_POINTER).children).toContain(expectedPointer);
    });

    it('Sets implicitType of the new node to false', () => {
      const result = addRootItem(uiSchemaMock, args);
      const newNode = getNodeByPointer(result, expectedPointer);
      expect(newNode.implicitType).toBe(false);
    });

    it('Calls the callback function with the new pointer', () => {
      addRootItem(uiSchemaMock, args);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedPointer);
    });

    it('Adds the given props to the new node', () => {
      const result = addRootItem(uiSchemaMock, args);
      const newNode = getNodeByPointer(result, expectedPointer);
      expect(newNode).toMatchObject(props);
    });
  });

  describe('addProperty', () => {
    const { pointer } = parentNodeMock;
    const props: Partial<UiSchemaNode> = { fieldType: FieldType.Object };
    const callback = jest.fn();
    const args: AddPropertyArgs = { pointer, props, callback };
    const expectedPropPointer = `${pointer}/${Keyword.Properties}/name`;

    it('Adds a property with the name "name" to the given node', () => {
      const result = addProperty(uiSchemaMock, args);
      const parentNode = getNodeByPointer(result, pointer);
      expect(parentNode.children).toContain(expectedPropPointer);
    });

    it('Calls the callback function with the new pointer', () => {
      addProperty(uiSchemaMock, args);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedPropPointer);
    });

    it('Sets implicitType of the new node to false', () => {
      const result = addProperty(uiSchemaMock, args);
      const newNode = getNodeByPointer(result, expectedPropPointer);
      expect(newNode.implicitType).toBe(false);
    });
  });

  describe('deleteEnumValue', () => {
    it('Deletes the given enum value from the given node', () => {
      const path = enumNodeMock.pointer;
      const value = enumNodeMock.enum[0];
      const args: DeleteEnumValueArgs = { path, value };
      const result = deleteEnumValue(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, path);
      expect(updatedNode.enum).toEqual(enumNodeMock.enum.slice(1));
    });
  });

  describe('promoteProperty', () => {
    it('Convert a property to a root level definition', () => {
      const { pointer } = stringNodeMock;
      const result = promoteProperty(uiSchemaMock, pointer);
      const expectedPointer = `${ROOT_POINTER}/$defs/${substringAfterLast(pointer, '/')}`;
      expect(getPointers(result)).toContain(expectedPointer);
      expect(getNodeByPointer(result, expectedPointer)).toMatchObject({ fieldType: stringNodeMock.fieldType });
    });
  });

  describe('deleteNode', () => {
    it('Deletes the given node', () => {
      const { pointer } = stringNodeMock;
      const result = deleteNode(uiSchemaMock, pointer);
      expect(getPointers(result)).not.toContain(pointer);
    });
  });

  describe('setRestriction', () => {
    it('Sets a restriction of the given node', () => {
      const { pointer } = stringNodeMock;
      const key = StrRestrictionKey.maxLength;
      const value = 144;
      const args: SetRestrictionArgs = { path: pointer, key, value: value.toString() };
      const result = setRestriction(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.restrictions[key]).toEqual(value);
    });
  });

  describe('setRestrictions', () => {
    it('Sets restrictions of the given node', () => {
      const { pointer } = stringNodeMock;
      const restrictions = { maxLength: 144, minLength: 12 };
      const args: SetRestrictionsArgs = { path: pointer, restrictions };
      const result = setRestrictions(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.restrictions).toEqual(restrictions);
    });
  });

  describe('setRef', () => {
    it('Sets a reference to a type on the given node', () => {
      const path = numberNodeMock.pointer;
      const ref = defNodeMock.pointer;
      const args: SetRefArgs = { path, ref };
      const result = setRef(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, path);
      expect(updatedNode.reference).toEqual(ref);
      expect(updatedNode.objectKind).toEqual(ObjectKind.Reference);
      expect(updatedNode.fieldType).toEqual(defNodeMock.fieldType);
      expect(updatedNode.implicitType).toBe(true);
    });
  });

  describe('setType', () => {
    it('Sets the type of the given node', () => {
      const path = numberNodeMock.pointer;
      const type = FieldType.String;
      const args: SetTypeArgs = { path, type };
      const result = setType(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, path);
      expect(updatedNode.fieldType).toEqual(type);
      expect(updatedNode.implicitType).toBe(false);
    });
  });

  describe('setTitle', () => {
    it('Sets the title of the given node', () => {
      const path = numberNodeMock.pointer;
      const title = 'test title';
      const args: SetTitleArgs = { path, title };
      const result = setTitle(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, path);
      expect(updatedNode.title).toEqual(title);
    });
  });

  describe('setDescription', () => {
    it('Sets the description of the given node', () => {
      const path = numberNodeMock.pointer;
      const description = 'test description';
      const args: SetDescriptionArgs = { path, description };
      const result = setDescription(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, path);
      expect(updatedNode.description).toEqual(description);
    });
  });

  describe('setRequired', () => {
    const optionalPropertyPath = optionalNodeMock.pointer;
    const requiredPropertyPath = requiredNodeMock.pointer;

    it.each([true, false])('Sets "isRequired" to %s', (required) => {
      const schemaWithChangeOnOptional = setRequired(uiSchemaMock, { path: optionalPropertyPath, required });
      const schemaWithChangeOnRequired = setRequired(uiSchemaMock, { path: requiredPropertyPath, required });
      expect(getNodeByPointer(schemaWithChangeOnOptional, optionalPropertyPath).isRequired).toBe(required);
      expect(getNodeByPointer(schemaWithChangeOnRequired, requiredPropertyPath).isRequired).toBe(required);
    });
  });

  describe('setCombinationType', () => {
    const path = allOfNodeMock.pointer;
    const combinationType = CombinationKind.OneOf;
    const args: SetCombinationTypeArgs = { path, type: combinationType };
    const result = setCombinationType(uiSchemaMock, args);
    const updatedNode = getNodeByPointer(result, path);

    it('Sets the combination type of the given node', () => {
      expect(updatedNode.fieldType).toEqual(combinationType);
    });

    it('Updates the childrens\' pointers', () => {
      expect(allOfNodeMock.children.length).toEqual(updatedNode.children.length);
      getChildNodesByPointer(result, path).forEach((childNode) => {
        expect(childNode.pointer.startsWith(`${path}/${combinationType}`)).toBe(true);
      });
    });
  });

  describe('addCombinationItem', () => {
    it('Adds a new item to the given combination node and calls the callback function with its pointer', () => {
      const { pointer } = allOfNodeMock;
      const props: Partial<UiSchemaNode> = { fieldType: FieldType.Number };
      const callback = jest.fn();
      const args: AddCombinationItemArgs = { pointer, props, callback };
      const result = addCombinationItem(uiSchemaMock, args);
      const parentNode = getNodeByPointer(result, pointer);
      const newItemPointer = callback.mock.calls[0][0];
      expect(getPointers(result)).toContain(newItemPointer);
      expect(getNodeByPointer(result, newItemPointer)).toMatchObject(props);
      expect(parentNode.children).toContain(newItemPointer);
    });
  });

  describe('setPropertyName', () => {
    const { pointer } = stringNodeMock;
    const name = 'new name';
    const callback = jest.fn();
    const args: SetPropertyNameArgs = { path: pointer, name, callback };
    const expectedPointer = substringBeforeLast(pointer, '/') + '/' + name;

    it('Sets the name of the given property', () => {
      const result = setPropertyName(uiSchemaMock, args);
      const newPointers = getPointers(result);
      expect(newPointers).toContain(expectedPointer);
      expect(newPointers).not.toContain(pointer);
      expect(getNodeByPointer(result, expectedPointer)).toMatchObject({
        ...stringNodeMock,
        pointer: expectedPointer,
      });
    });

    it('Calls the callback function with the new pointer', () => {
      setPropertyName(uiSchemaMock, args);
      expect(callback).toBeCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedPointer);
    });
  });

  describe('toggleArrayField', () => {
    it('Converts an array node to a single field node', () => {
      const { pointer } = arrayNodeMock;
      const result = toggleArrayField(uiSchemaMock, pointer);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.fieldType).toEqual(arrayNodeMock.fieldType);
      expect(updatedNode.isArray).toBe(false);
    });

    it('Converts a single field node to an array node', () => {
      const { pointer } = stringNodeMock;
      const result = toggleArrayField(uiSchemaMock, pointer);
      const updatedNode = getNodeByPointer(result, pointer);
      expect(updatedNode.fieldType).toEqual(stringNodeMock.fieldType);
      expect(updatedNode.isArray).toBe(true);
    });
  });

  describe('changeChildrenOrder', () => {
    it('Changes the order of the children of the given node', () => {
      const { pointer: parentPointer, children } = parentNodeMock;
      const [pointerA, pointerB] = children;
      const args: ChangeChildrenOrderArgs = { pointerA, pointerB };
      const result = changeChildrenOrder(uiSchemaMock, args);
      const updatedNode = getNodeByPointer(result, parentPointer);
      expect(updatedNode.children[0]).toBe(pointerB);
      expect(updatedNode.children[1]).toBe(pointerA);
    });
  });
});
