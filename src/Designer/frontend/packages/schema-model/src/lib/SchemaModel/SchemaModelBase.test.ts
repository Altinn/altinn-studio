import {
  allOfNodeMock,
  arrayNodeMock,
  combinationDefNodeMock,
  combinationNodeWithMultipleChildrenMock,
  defNodeMock,
  defNodeWithChildrenChildMock,
  defNodeWithChildrenMock,
  enumNodeMock,
  nodeWithSameNameAsStringNodeMock,
  numberNodeMock,
  optionalNodeMock,
  parentNodeMock,
  referenceDefinitionMock,
  referenceNodeMock,
  referenceToCombinationDefNodeMock,
  referenceToObjectNodeMock,
  requiredNodeMock,
  rootNodeMock,
  simpleArrayMock,
  simpleParentNodeMock,
  stringNodeMock,
  subParentNodeMock,
  uiSchemaMock,
  unusedDefinitionMock,
  unusedDefinitionWithSameNameAsExistingObjectMock,
} from '../../../test/uiSchemaMock';
import { expect } from '@jest/globals';
import { extractNameFromPointer } from '../pointerUtils';
import { ROOT_POINTER } from '../constants';
import { SchemaModel } from './SchemaModel';
import { SchemaModelBase } from './SchemaModelBase';

// Test data:
const schemaModel = SchemaModel.fromArray(uiSchemaMock);
const schemaModelBase = new SchemaModelBase(schemaModel.getNodeMap());

describe('SchemaModel', () => {
  describe('getRootNode', () => {
    it('Returns the root node', () => {
      expect(schemaModelBase.getRootNode()).toEqual(rootNodeMock);
    });

    it('Throws an error if the root node is not a field nor a combination node', () => {
      const invalidRootNode = { ...referenceNodeMock, schemaPointer: ROOT_POINTER };
      const model = SchemaModel.fromArray([invalidRootNode]);
      const modelBase = new SchemaModelBase(model.getNodeMap());
      expect(() => modelBase.getRootNode()).toThrowError();
    });
  });

  describe('getNodeBySchemaPointer', () => {
    it('Returns the node with the given pointer', () => {
      expect(schemaModelBase.getNodeBySchemaPointer(parentNodeMock.schemaPointer)).toEqual(
        parentNodeMock,
      );
      expect(schemaModelBase.getNodeBySchemaPointer(defNodeMock.schemaPointer)).toEqual(
        defNodeMock,
      );
      expect(schemaModelBase.getNodeBySchemaPointer(allOfNodeMock.schemaPointer)).toEqual(
        allOfNodeMock,
      );
      expect(schemaModelBase.getNodeBySchemaPointer(stringNodeMock.schemaPointer)).toEqual(
        stringNodeMock,
      );
    });
  });

  describe('hasNode', () => {
    it('Returns true if the node with the given pointer exists', () => {
      expect(schemaModelBase.hasNode(parentNodeMock.schemaPointer)).toBe(true);
      expect(schemaModelBase.hasNode(defNodeMock.schemaPointer)).toBe(true);
      expect(schemaModelBase.hasNode(allOfNodeMock.schemaPointer)).toBe(true);
      expect(schemaModelBase.hasNode(stringNodeMock.schemaPointer)).toBe(true);
    });

    it('Returns false if the node with the given pointer does not exist', () => {
      expect(schemaModelBase.hasNode('badPointer')).toBe(false);
    });
  });

  describe('hasDefinition', () => {
    it('Returns true if the definition with the given name exists', () => {
      expect(schemaModelBase.hasDefinition(extractNameFromPointer(defNodeMock.schemaPointer))).toBe(
        true,
      );
      expect(
        schemaModelBase.hasDefinition(
          extractNameFromPointer(defNodeWithChildrenMock.schemaPointer),
        ),
      ).toBe(true);
    });

    it('Returns false if the definition with the given name does not exist', () => {
      expect(schemaModelBase.hasDefinition('badName')).toBe(false);
    });
  });

  describe('getDefinitions', () => {
    it('Returns all definition nodes', () => {
      const result = schemaModelBase.getDefinitions();
      expect(result).toEqual([
        defNodeMock,
        defNodeWithChildrenMock,
        unusedDefinitionMock,
        unusedDefinitionWithSameNameAsExistingObjectMock,
        referenceDefinitionMock,
        combinationDefNodeMock,
      ]);
    });
  });

  describe('getRootProperties', () => {
    it('Returns all root properties', () => {
      const result = schemaModelBase.getRootProperties();
      expect(result).toEqual([
        parentNodeMock,
        allOfNodeMock,
        simpleParentNodeMock,
        simpleArrayMock,
        referenceToObjectNodeMock,
        nodeWithSameNameAsStringNodeMock,
        combinationNodeWithMultipleChildrenMock,
        referenceToCombinationDefNodeMock,
      ]);
    });
  });

  describe('getRootNodes', () => {
    it('Returns all root nodes', () => {
      const result = schemaModelBase.getRootChildren();
      expect(result).toEqual([
        parentNodeMock,
        defNodeMock,
        allOfNodeMock,
        simpleParentNodeMock,
        simpleArrayMock,
        defNodeWithChildrenMock,
        referenceToObjectNodeMock,
        unusedDefinitionMock,
        unusedDefinitionWithSameNameAsExistingObjectMock,
        referenceDefinitionMock,
        nodeWithSameNameAsStringNodeMock,
        combinationNodeWithMultipleChildrenMock,
        referenceToCombinationDefNodeMock,
        combinationDefNodeMock,
      ]);
    });
  });

  describe('getChildNodes', () => {
    it('Returns all child nodes when the given node is an object', () => {
      const result = schemaModelBase.getChildNodes(parentNodeMock.schemaPointer);
      expect(result).toEqual([
        stringNodeMock,
        numberNodeMock,
        enumNodeMock,
        arrayNodeMock,
        optionalNodeMock,
        requiredNodeMock,
        referenceNodeMock,
        subParentNodeMock,
      ]);
    });

    it("Returns the referenced object's child nodes when the given node is a reference", () => {
      const result = schemaModelBase.getChildNodes(referenceToObjectNodeMock.schemaPointer);
      expect(result).toEqual([defNodeWithChildrenChildMock]);
    });
  });

  describe('getReferredNode', () => {
    it('Returns the referred node', () => {
      const result = schemaModelBase.getReferredNode(referenceNodeMock);
      expect(result).toEqual(defNodeMock);
    });
  });

  describe('getFinalNode', () => {
    it('Returns the node itself when it is not a reference', () => {
      const result = schemaModelBase.getFinalNode(parentNodeMock.schemaPointer);
      expect(result).toEqual(parentNodeMock);
    });

    it('Returns the referred node when the given node is a reference to a field node', () => {
      const result = schemaModelBase.getFinalNode(referenceNodeMock.schemaPointer);
      expect(result).toEqual(defNodeMock);
    });

    it('Returns the node referred by the referred node when the given node is a reference to a reference to a field node', () => {
      const result = schemaModelBase.getFinalNode(referenceDefinitionMock.schemaPointer);
      expect(result).toEqual(defNodeMock);
    });
  });

  describe('doesNodeHaveChildWithName', () => {
    it('Returns true when the given node has a child with the given name', () => {
      const result = schemaModelBase.doesNodeHaveChildWithName(
        parentNodeMock.schemaPointer,
        'stringNode',
      );
      expect(result).toBe(true);
    });

    it('Returns true when the node referred by the given node has a child with the given name', () => {
      const result = schemaModelBase.doesNodeHaveChildWithName(
        referenceToObjectNodeMock.schemaPointer,
        'child',
      );
      expect(result).toBe(true);
    });

    it('Returns false when the given node does not have a child with the given name', () => {
      const result = schemaModelBase.doesNodeHaveChildWithName(
        parentNodeMock.schemaPointer,
        'badName',
      );
      expect(result).toBe(false);
    });

    it('Returns false when the node referred by the given node does not have a child with the given name', () => {
      const result = schemaModelBase.doesNodeHaveChildWithName(
        referenceToObjectNodeMock.schemaPointer,
        'badName',
      );
      expect(result).toBe(false);
    });
  });
});
