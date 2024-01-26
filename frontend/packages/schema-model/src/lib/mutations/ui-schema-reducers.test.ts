import {
  addCombinationItem,
  changeChildrenOrder,
  deleteNode,
  promoteProperty,
  setCombinationType,
  setCustomProperties,
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
  ChangeChildrenOrderArgs,
  SetCombinationTypeArgs,
  SetDescriptionArgs,
  SetPropertyNameArgs,
  SetRefArgs,
  SetRestrictionArgs,
  SetRestrictionsArgs,
  SetTitleArgs,
  SetTypeArgs,
  SetCustomPropertiesArgs,
} from './ui-schema-reducers';
import {
  allOfNodeMock,
  arrayNodeMock,
  numberNodeMock,
  optionalNodeMock,
  parentNodeMock,
  requiredNodeMock,
  stringNodeMock,
  uiSchemaMock,
  simpleParentNodeMock,
  simpleArrayMock,
  referenceNodeMock,
  unusedDefinitionMock,
} from '../../../test/uiSchemaMock';
import { getChildNodesByFieldPointer } from '../selectors';
import { expect } from '@jest/globals';
import { CombinationKind, FieldType, Keyword, ObjectKind, StrRestrictionKey } from '../../types';
import { ROOT_POINTER } from '../constants';
import { getPointers } from '../mappers/getPointers';
import { substringAfterLast, substringBeforeLast } from 'app-shared/utils/stringUtils';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { validateTestUiSchema } from '../../../test/validateTestUiSchema';
import { SchemaModel } from '../SchemaModel';
import type { FieldNode } from '../../types/FieldNode';
import type { ReferenceNode } from '../../types/ReferenceNode';
import type { CombinationNode } from '../../types/CombinationNode';

describe('ui-schema-reducers', () => {
  let result: SchemaModel;
  const modelMock = SchemaModel.fromArray(uiSchemaMock);
  const createNewModelMock = () => modelMock.deepClone();

  beforeEach(() => {
    result = null;
  });

  afterEach(() => {
    validateTestUiSchema(result.asArray());
    jest.clearAllMocks();
  });

  describe('promoteProperty', () => {
    it('Converts a property to a root level definition', () => {
      const { pointer } = stringNodeMock;
      result = promoteProperty(createNewModelMock(), pointer);
      const expectedPointer = `${ROOT_POINTER}/$defs/${substringAfterLast(pointer, '/')}`;
      expect(getPointers(result.asArray())).toContain(expectedPointer);
      expect(result.getNode(expectedPointer)).toMatchObject({
        fieldType: stringNodeMock.fieldType,
      });
    });
  });

  describe('deleteNode', () => {
    it('Deletes the given node', () => {
      const { pointer } = stringNodeMock;
      result = deleteNode(createNewModelMock(), pointer);
      expect(getPointers(result.asArray())).not.toContain(pointer);
    });
  });

  describe('setRestriction', () => {
    it('Sets a restriction of the given node', () => {
      const { pointer } = stringNodeMock;
      const key = StrRestrictionKey.maxLength;
      const value = 144;
      const args: SetRestrictionArgs = { path: pointer, key, value: value.toString() };
      result = setRestriction(createNewModelMock(), args);
      const updatedNode = result.getNode(pointer);
      expect(updatedNode.restrictions[key]).toEqual(value);
    });
  });

  describe('setRestrictions', () => {
    it('Sets restrictions of the given node', () => {
      const { pointer } = stringNodeMock;
      const restrictions = { maxLength: 144, minLength: 12 };
      const args: SetRestrictionsArgs = { path: pointer, restrictions };
      result = setRestrictions(createNewModelMock(), args);
      const updatedNode = result.getNode(pointer);
      expect(updatedNode.restrictions).toEqual(restrictions);
    });
  });

  describe('setRef', () => {
    it('Sets a reference to a type on the given node', () => {
      const path = referenceNodeMock.pointer;
      const ref = unusedDefinitionMock.pointer;
      const args: SetRefArgs = { path, ref };
      result = setRef(createNewModelMock(), args);
      const updatedNode = result.getNode(path) as ReferenceNode;
      expect(updatedNode.reference).toEqual(ref);
      expect(updatedNode.objectKind).toEqual(ObjectKind.Reference);
      expect(updatedNode.implicitType).toBe(true);
      expect(result.getReferredNode(updatedNode)).toEqual(unusedDefinitionMock);
    });
  });

  describe('setType', () => {
    it('Sets the type of the given node', () => {
      const path = numberNodeMock.pointer;
      const type = FieldType.String;
      const args: SetTypeArgs = { path, type };
      result = setType(createNewModelMock(), args);
      const updatedNode = result.getNode(path) as FieldNode;
      expect(updatedNode.fieldType).toEqual(type);
      expect(updatedNode.implicitType).toBe(false);
    });
  });

  describe('setTitle', () => {
    it('Sets the title of the given node', () => {
      const path = numberNodeMock.pointer;
      const title = 'test title';
      const args: SetTitleArgs = { path, title };
      result = setTitle(createNewModelMock(), args);
      const updatedNode = result.getNode(path);
      expect(updatedNode.title).toEqual(title);
    });
  });

  describe('setDescription', () => {
    it('Sets the description of the given node', () => {
      const path = numberNodeMock.pointer;
      const description = 'test description';
      const args: SetDescriptionArgs = { path, description };
      result = setDescription(createNewModelMock(), args);
      const updatedNode = result.getNode(path);
      expect(updatedNode.description).toEqual(description);
    });
  });

  describe('setRequired', () => {
    const optionalPropertyPath = optionalNodeMock.pointer;
    const requiredPropertyPath = requiredNodeMock.pointer;

    it.each([true, false])('Sets "isRequired" to %s when it was false', (required) => {
      result = setRequired(createNewModelMock(), { path: optionalPropertyPath, required });
      expect(result.getNode(optionalPropertyPath).isRequired).toBe(required);
    });

    it.each([true, false])('Sets "isRequired" to %s when it was true', (required) => {
      result = setRequired(createNewModelMock(), { path: requiredPropertyPath, required });
      expect(result.getNode(requiredPropertyPath).isRequired).toBe(required);
    });
  });

  describe('setCustomProperties', () => {
    it('Sets custom properties of the given node', () => {
      const path = numberNodeMock.pointer;
      const properties: KeyValuePairs = { someCustomProp: 'test' };
      const args: SetCustomPropertiesArgs = { path, properties };
      result = setCustomProperties(createNewModelMock(), args);
      const updatedNode = result.getNode(path);
      expect(updatedNode.custom).toEqual(properties);
    });
  });

  describe('setCombinationType', () => {
    const path = allOfNodeMock.pointer;
    const combinationType = CombinationKind.OneOf;
    const args: SetCombinationTypeArgs = { path, type: combinationType };

    it('Sets the combination type of the given node', () => {
      result = setCombinationType(createNewModelMock(), args);
      const updatedNode = result.getNode(path) as CombinationNode;
      expect(updatedNode.combinationType).toEqual(combinationType);
    });

    it("Updates the children's pointers", () => {
      result = setCombinationType(createNewModelMock(), args);
      expect(result.getChildNodes(path).length).toEqual(allOfNodeMock.children.length);
      getChildNodesByFieldPointer(result.asArray(), path).forEach((childNode) => {
        expect(childNode.pointer.startsWith(`${path}/${combinationType}`)).toBe(true);
      });
    });
  });

  describe('addCombinationItem', () => {
    it('Adds a new item to the given combination node and calls the callback function with its pointer', () => {
      const { pointer } = allOfNodeMock;
      const callback = jest.fn();
      const args: AddCombinationItemArgs = { pointer, callback };
      result = addCombinationItem(createNewModelMock(), args);
      const newItemPointer = callback.mock.calls[0][0];
      expect(result.hasNode(newItemPointer)).toBe(true);
      expect(getPointers(result.getChildNodes(pointer))).toContain(newItemPointer);
    });
  });

  describe('setPropertyName', () => {
    const { pointer } = stringNodeMock;
    const name = 'new name';
    const callback = jest.fn();
    const args: SetPropertyNameArgs = { path: pointer, name, callback };
    const expectedPointer = substringBeforeLast(pointer, '/') + '/' + name;

    it('Sets the name of the given property', () => {
      result = setPropertyName(createNewModelMock(), args);
      const newPointers = getPointers(result.asArray());
      expect(newPointers).toContain(expectedPointer);
      expect(newPointers).not.toContain(pointer);
      expect(result.getNode(expectedPointer)).toMatchObject({
        ...stringNodeMock,
        pointer: expectedPointer,
      });
    });

    it('Calls the callback function with the new pointer', () => {
      result = setPropertyName(createNewModelMock(), args);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expectedPointer);
    });
  });

  describe('toggleArrayField', () => {
    it('Converts an array node to a single field node', () => {
      const { pointer } = arrayNodeMock;
      result = toggleArrayField(createNewModelMock(), pointer);
      const updatedNode = result.getNode(pointer) as FieldNode;
      expect(updatedNode.fieldType).toEqual(arrayNodeMock.fieldType);
      expect(updatedNode.isArray).toBe(false);
    });

    it('Converts a single field node to an array node', () => {
      const { pointer } = stringNodeMock;
      result = toggleArrayField(createNewModelMock(), pointer);
      const updatedNode = result.getNode(pointer) as FieldNode;
      expect(updatedNode.fieldType).toEqual(stringNodeMock.fieldType);
      expect(updatedNode.isArray).toBe(true);
    });

    it("should update the children's pointers, and add /Items/ when isArray toggles to true", () => {
      const { pointer } = simpleParentNodeMock;
      result = toggleArrayField(createNewModelMock(), pointer);
      const children = result.getChildNodes(pointer);
      expect(children.length).toEqual(simpleParentNodeMock.children.length);
      children.forEach((childNode) => {
        expect(childNode.pointer).toContain(Keyword.Items);
      });
    });

    it("should update the children's pointers without adding /Items/ when isArray toggles to false", () => {
      const { pointer } = simpleArrayMock;
      result = toggleArrayField(createNewModelMock(), pointer);
      const children = result.getChildNodes(pointer);
      expect(children.length).toEqual(simpleArrayMock.children.length);
      children.forEach((childNode) => {
        expect(childNode).not.toContain(Keyword.Items);
      });
    });
  });

  describe('changeChildrenOrder', () => {
    it('Changes the order of the children of the given node', () => {
      const { pointer: parentPointer, children } = parentNodeMock;
      const [pointerA, pointerB] = children;
      const args: ChangeChildrenOrderArgs = { pointerA, pointerB };
      result = changeChildrenOrder(createNewModelMock(), args);
      const updatedChildren = result.getChildNodes(parentPointer);
      expect(updatedChildren[0].pointer).toBe(pointerB);
      expect(updatedChildren[1].pointer).toBe(pointerA);
    });
  });
});
