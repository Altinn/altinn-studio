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
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { validateTestUiSchema } from '../../../test/validateTestUiSchema';
import { SchemaModel } from '../SchemaModel';
import type { FieldNode } from '../../types/FieldNode';
import type { ReferenceNode } from '../../types/ReferenceNode';
import type { CombinationNode } from '../../types/CombinationNode';
import { StringUtils } from 'libs/studio-pure-functions/src';

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
      const { schemaPointer } = stringNodeMock;
      result = promoteProperty(createNewModelMock(), schemaPointer);
      const expectedPointer = `${ROOT_POINTER}/$defs/${StringUtils.substringAfterLast(schemaPointer, '/')}`;
      expect(getPointers(result.asArray())).toContain(expectedPointer);
      expect(result.getNodeBySchemaPointer(expectedPointer)).toMatchObject({
        fieldType: stringNodeMock.fieldType,
      });
    });
  });

  describe('deleteNode', () => {
    it('Deletes the given node', () => {
      const { schemaPointer } = stringNodeMock;
      result = deleteNode(createNewModelMock(), schemaPointer);
      expect(getPointers(result.asArray())).not.toContain(schemaPointer);
    });
  });

  describe('setRestriction', () => {
    it('Sets a restriction of the given node', () => {
      const { schemaPointer } = stringNodeMock;
      const key = StrRestrictionKey.maxLength;
      const value = 144;
      const args: SetRestrictionArgs = { path: schemaPointer, key, value: value.toString() };
      result = setRestriction(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(schemaPointer);
      expect(updatedNode.restrictions[key]).toEqual(value);
    });
  });

  describe('setRestrictions', () => {
    it('Sets restrictions of the given node', () => {
      const { schemaPointer } = stringNodeMock;
      const restrictions = { maxLength: 144, minLength: 12 };
      const args: SetRestrictionsArgs = { path: schemaPointer, restrictions };
      result = setRestrictions(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(schemaPointer);
      expect(updatedNode.restrictions).toEqual(restrictions);
    });
  });

  describe('setRef', () => {
    it('Sets a reference to a type on the given node', () => {
      const path = referenceNodeMock.schemaPointer;
      const ref = unusedDefinitionMock.schemaPointer;
      const args: SetRefArgs = { path, ref };
      result = setRef(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(path) as ReferenceNode;
      expect(updatedNode.reference).toEqual(ref);
      expect(updatedNode.objectKind).toEqual(ObjectKind.Reference);
      expect(updatedNode.implicitType).toBe(true);
      expect(result.getReferredNode(updatedNode)).toEqual(unusedDefinitionMock);
    });
  });

  describe('setType', () => {
    it('Sets the type of the given node', () => {
      const path = numberNodeMock.schemaPointer;
      const type = FieldType.String;
      const args: SetTypeArgs = { path, type };
      result = setType(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(path) as FieldNode;
      expect(updatedNode.fieldType).toEqual(type);
      expect(updatedNode.implicitType).toBe(false);
    });
  });

  describe('setTitle', () => {
    it('Sets the title of the given node', () => {
      const path = numberNodeMock.schemaPointer;
      const title = 'test title';
      const args: SetTitleArgs = { path, title };
      result = setTitle(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(path);
      expect(updatedNode.title).toEqual(title);
    });
  });

  describe('setDescription', () => {
    it('Sets the description of the given node', () => {
      const path = numberNodeMock.schemaPointer;
      const description = 'test description';
      const args: SetDescriptionArgs = { path, description };
      result = setDescription(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(path);
      expect(updatedNode.description).toEqual(description);
    });
  });

  describe('setRequired', () => {
    const optionalPropertyPath = optionalNodeMock.schemaPointer;
    const requiredPropertyPath = requiredNodeMock.schemaPointer;

    it.each([true, false])('Sets "isRequired" to %s when it was false', (required) => {
      result = setRequired(createNewModelMock(), { path: optionalPropertyPath, required });
      expect(result.getNodeBySchemaPointer(optionalPropertyPath).isRequired).toBe(required);
    });

    it.each([true, false])('Sets "isRequired" to %s when it was true', (required) => {
      result = setRequired(createNewModelMock(), { path: requiredPropertyPath, required });
      expect(result.getNodeBySchemaPointer(requiredPropertyPath).isRequired).toBe(required);
    });
  });

  describe('setCustomProperties', () => {
    it('Sets custom properties of the given node', () => {
      const path = numberNodeMock.schemaPointer;
      const properties: KeyValuePairs = { someCustomProp: 'test' };
      const args: SetCustomPropertiesArgs = { path, properties };
      result = setCustomProperties(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(path);
      expect(updatedNode.custom).toEqual(properties);
    });
  });

  describe('setCombinationType', () => {
    const path = allOfNodeMock.schemaPointer;
    const combinationType = CombinationKind.OneOf;
    const args: SetCombinationTypeArgs = { path, type: combinationType };

    it('Sets the combination type of the given node', () => {
      result = setCombinationType(createNewModelMock(), args);
      const updatedNode = result.getNodeBySchemaPointer(path) as CombinationNode;
      expect(updatedNode.combinationType).toEqual(combinationType);
    });

    it("Updates the children's pointers", () => {
      result = setCombinationType(createNewModelMock(), args);
      expect(result.getChildNodes(path).length).toEqual(allOfNodeMock.children.length);
      getChildNodesByFieldPointer(result.asArray(), path).forEach((childNode) => {
        expect(childNode.schemaPointer.startsWith(`${path}/${combinationType}`)).toBe(true);
      });
    });
  });

  describe('addCombinationItem', () => {
    it('Adds a new item to the given combination node and calls the callback function with its pointer', () => {
      const { schemaPointer } = allOfNodeMock;
      const callback = jest.fn();
      const args: AddCombinationItemArgs = { schemaPointer, callback };
      result = addCombinationItem(createNewModelMock(), args);
      const newItemPointer = callback.mock.calls[0][0];
      expect(result.hasNode(newItemPointer)).toBe(true);
      expect(getPointers(result.getChildNodes(schemaPointer))).toContain(newItemPointer);
    });
  });

  describe('setPropertyName', () => {
    const { schemaPointer } = stringNodeMock;
    const name = 'new name';
    const callback = jest.fn();
    const args: SetPropertyNameArgs = { path: schemaPointer, name, callback };
    const expectedPointer = StringUtils.substringBeforeLast(schemaPointer, '/') + '/' + name;

    it('Sets the name of the given property', () => {
      result = setPropertyName(createNewModelMock(), args);
      const newPointers = getPointers(result.asArray());
      expect(newPointers).toContain(expectedPointer);
      expect(newPointers).not.toContain(schemaPointer);
      expect(result.getNodeBySchemaPointer(expectedPointer)).toMatchObject({
        ...stringNodeMock,
        schemaPointer: expectedPointer,
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
      const { schemaPointer } = arrayNodeMock;
      result = toggleArrayField(createNewModelMock(), schemaPointer);
      const updatedNode = result.getNodeBySchemaPointer(schemaPointer) as FieldNode;
      expect(updatedNode.fieldType).toEqual(arrayNodeMock.fieldType);
      expect(updatedNode.isArray).toBe(false);
    });

    it('Converts a single field node to an array node', () => {
      const { schemaPointer } = stringNodeMock;
      result = toggleArrayField(createNewModelMock(), schemaPointer);
      const updatedNode = result.getNodeBySchemaPointer(schemaPointer) as FieldNode;
      expect(updatedNode.fieldType).toEqual(stringNodeMock.fieldType);
      expect(updatedNode.isArray).toBe(true);
    });

    it("should update the children's pointers, and add /Items/ when isArray toggles to true", () => {
      const { schemaPointer } = simpleParentNodeMock;
      result = toggleArrayField(createNewModelMock(), schemaPointer);
      const children = result.getChildNodes(schemaPointer);
      expect(children.length).toEqual(simpleParentNodeMock.children.length);
      children.forEach((childNode) => {
        expect(childNode.schemaPointer).toContain(Keyword.Items);
      });
    });

    it("should update the children's pointers without adding /Items/ when isArray toggles to false", () => {
      const { schemaPointer } = simpleArrayMock;
      result = toggleArrayField(createNewModelMock(), schemaPointer);
      const children = result.getChildNodes(schemaPointer);
      expect(children.length).toEqual(simpleArrayMock.children.length);
      children.forEach((childNode) => {
        expect(childNode).not.toContain(Keyword.Items);
      });
    });
  });

  describe('changeChildrenOrder', () => {
    it('Changes the order of the children of the given node', () => {
      const { schemaPointer: parentPointer, children } = parentNodeMock;
      const [pointerA, pointerB] = children;
      const args: ChangeChildrenOrderArgs = { pointerA, pointerB };
      result = changeChildrenOrder(createNewModelMock(), args);
      const updatedChildren = result.getChildNodes(parentPointer);
      expect(updatedChildren[0].schemaPointer).toBe(pointerB);
      expect(updatedChildren[1].schemaPointer).toBe(pointerA);
    });
  });
});
