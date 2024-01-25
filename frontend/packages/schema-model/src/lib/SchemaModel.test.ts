import { SchemaModel } from './SchemaModel';
import {
  allOfNodeChildMock,
  allOfNodeMock,
  arrayNodeMock,
  combinationNodeWithMultipleChildrenMock,
  defNodeMock,
  defNodeWithChildrenChildMock,
  defNodeWithChildrenGrandchildMock,
  defNodeWithChildrenMock,
  enumNodeMock,
  nodeWithSameNameAsStringNodeMock,
  numberNodeMock,
  optionalNodeMock,
  parentNodeMock,
  referenceDefinitionMock,
  referenceNodeMock,
  referenceToObjectNodeMock,
  requiredNodeMock,
  rootNodeMock,
  simpleArrayMock,
  simpleChildNodeMock,
  simpleParentNodeMock,
  stringNodeMock,
  subParentNodeMock,
  subSubNodeMock,
  uiSchemaMock,
  unusedDefinitionMock,
  unusedDefinitionWithSameNameAsExistingObjectMock,
} from '../../test/uiSchemaMock';
import { expect } from '@jest/globals';
import { validateTestUiSchema } from '../../test/validateTestUiSchema';
import type { NodePosition } from '../types';
import { CombinationKind, FieldType, ObjectKind } from '../types';
import type { FieldNode } from '../types/FieldNode';
import type { ReferenceNode } from '../types/ReferenceNode';
import { extractNameFromPointer } from './pointerUtils';
import { isArray, isDefinition } from './utils';
import { ROOT_POINTER } from './constants';
import type { CombinationNode } from '../types/CombinationNode';
import { last } from 'app-shared/utils/arrayUtils';

// Test data:

const schemaModel = SchemaModel.fromArray(uiSchemaMock);

type ParentNodeType = 'object' | 'combination';
const parentNodeTypes: ParentNodeType[] = ['object', 'combination'];

type AddNodeTestData = {
  parentPointer: string;
  name: string | undefined;
};
const addNodeTestData: { [key in ParentNodeType]: AddNodeTestData } = {
  object: {
    parentPointer: parentNodeMock.pointer,
    name: 'newName',
  },
  combination: {
    parentPointer: combinationNodeWithMultipleChildrenMock.pointer,
    name: undefined,
  },
};

type MoveNodeTestData = {
  target: NodePosition;
  expectedNewPointer: string;
};
const moveNodeTestData: { [key in ParentNodeType]: MoveNodeTestData } = {
  object: {
    target: { parentPointer: parentNodeMock.pointer, index: 1 },
    expectedNewPointer: '#/properties/test/properties/simpleChild',
  },
  combination: {
    target: { parentPointer: combinationNodeWithMultipleChildrenMock.pointer, index: 1 },
    expectedNewPointer: '#/properties/combinationNodeWithMultipleChildren/anyOf/1',
  },
};

describe('SchemaModel', () => {
  describe('asArray', () => {
    it('Returns the nodes as an array', () => {
      expect(schemaModel.asArray()).toEqual(uiSchemaMock);
    });
  });

  describe('isEmpty', () => {
    it('Returns true if only the root node is present', () => {
      const rootNode = { ...rootNodeMock, children: [] };
      const schema = [rootNode];
      validateTestUiSchema(schema);
      const emptyModel = SchemaModel.fromArray(schema);
      expect(emptyModel.isEmpty()).toBe(true);
    });

    it('Returns false if additional nodes are present', () => {
      expect(schemaModel.isEmpty()).toBe(false);
    });
  });

  describe('getRootNode', () => {
    it('Returns the root node', () => {
      expect(schemaModel.getRootNode()).toEqual(rootNodeMock);
    });

    it('Throws an error if the root node is not a field nor a combination node', () => {
      const invalidRootNode = { ...referenceNodeMock, pointer: ROOT_POINTER };
      const model = SchemaModel.fromArray([invalidRootNode]);
      expect(() => model.getRootNode()).toThrowError();
    });
  });

  describe('getNode', () => {
    it('Returns the node with the given pointer', () => {
      expect(schemaModel.getNode(parentNodeMock.pointer)).toEqual(parentNodeMock);
      expect(schemaModel.getNode(defNodeMock.pointer)).toEqual(defNodeMock);
      expect(schemaModel.getNode(allOfNodeMock.pointer)).toEqual(allOfNodeMock);
      expect(schemaModel.getNode(stringNodeMock.pointer)).toEqual(stringNodeMock);
    });
  });

  describe('hasNode', () => {
    it('Returns true if the node with the given pointer exists', () => {
      expect(schemaModel.hasNode(parentNodeMock.pointer)).toBe(true);
      expect(schemaModel.hasNode(defNodeMock.pointer)).toBe(true);
      expect(schemaModel.hasNode(allOfNodeMock.pointer)).toBe(true);
      expect(schemaModel.hasNode(stringNodeMock.pointer)).toBe(true);
    });

    it('Returns false if the node with the given pointer does not exist', () => {
      expect(schemaModel.hasNode('badPointer')).toBe(false);
    });
  });

  describe('hasDefinition', () => {
    it('Returns true if the definition with the given name exists', () => {
      expect(schemaModel.hasDefinition(extractNameFromPointer(defNodeMock.pointer))).toBe(true);
      expect(
        schemaModel.hasDefinition(extractNameFromPointer(defNodeWithChildrenMock.pointer)),
      ).toBe(true);
    });

    it('Returns false if the definition with the given name does not exist', () => {
      expect(schemaModel.hasDefinition('badName')).toBe(false);
    });
  });

  describe('getDefinitions', () => {
    it('Returns all definition nodes', () => {
      const result = schemaModel.getDefinitions();
      expect(result).toEqual([
        defNodeMock,
        defNodeWithChildrenMock,
        unusedDefinitionMock,
        unusedDefinitionWithSameNameAsExistingObjectMock,
        referenceDefinitionMock,
      ]);
    });
  });

  describe('getRootProperties', () => {
    it('Returns all root properties', () => {
      const result = schemaModel.getRootProperties();
      expect(result).toEqual([
        parentNodeMock,
        allOfNodeMock,
        simpleParentNodeMock,
        simpleArrayMock,
        referenceToObjectNodeMock,
        nodeWithSameNameAsStringNodeMock,
        combinationNodeWithMultipleChildrenMock,
      ]);
    });
  });

  describe('getRootNodes', () => {
    it('Returns all root nodes', () => {
      const result = schemaModel.getRootChildren();
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
      ]);
    });
  });

  describe('getChildNodes', () => {
    it('Returns all child nodes when the given node is an object', () => {
      const result = schemaModel.getChildNodes(parentNodeMock.pointer);
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
      const result = schemaModel.getChildNodes(referenceToObjectNodeMock.pointer);
      expect(result).toEqual([defNodeWithChildrenChildMock]);
    });
  });

  describe('getReferredNode', () => {
    it('Returns the referred node', () => {
      const result = schemaModel.getReferredNode(referenceNodeMock);
      expect(result).toEqual(defNodeMock);
    });
  });

  describe('getFinalNode', () => {
    it('Returns the node itself when it is not a reference', () => {
      const result = schemaModel.getFinalNode(parentNodeMock.pointer);
      expect(result).toEqual(parentNodeMock);
    });

    it('Returns the referred node when the given node is a reference to a field node', () => {
      const result = schemaModel.getFinalNode(referenceNodeMock.pointer);
      expect(result).toEqual(defNodeMock);
    });

    it('Returns the node referred by the referred node when the given node is a reference to a reference to a field node', () => {
      const result = schemaModel.getFinalNode(referenceDefinitionMock.pointer);
      expect(result).toEqual(defNodeMock);
    });
  });

  describe('doesNodeHaveChildWithName', () => {
    it('Returns true when the given node has a child with the given name', () => {
      const result = schemaModel.doesNodeHaveChildWithName(parentNodeMock.pointer, 'stringNode');
      expect(result).toBe(true);
    });

    it('Returns true when the node referred by the given node has a child with the given name', () => {
      const result = schemaModel.doesNodeHaveChildWithName(
        referenceToObjectNodeMock.pointer,
        'child',
      );
      expect(result).toBe(true);
    });

    it('Returns false when the given node does not have a child with the given name', () => {
      const result = schemaModel.doesNodeHaveChildWithName(parentNodeMock.pointer, 'badName');
      expect(result).toBe(false);
    });

    it('Returns false when the node referred by the given node does not have a child with the given name', () => {
      const result = schemaModel.doesNodeHaveChildWithName(
        referenceToObjectNodeMock.pointer,
        'badName',
      );
      expect(result).toBe(false);
    });
  });

  describe('addCombination', () => {
    const parentPointer = parentNodeMock.pointer;
    const index = 2;
    const target: NodePosition = { parentPointer, index };

    describe.each([CombinationKind.AnyOf, CombinationKind.AllOf, CombinationKind.OneOf, undefined])(
      'When type is %s',
      (type) => {
        const model = schemaModel.deepClone();
        const name = 'newName';
        const result = model.addCombination(name, target, type);
        const expectedType: CombinationKind = type ?? CombinationKind.AnyOf;

        it('Adds a combination node', () => {
          expect(model.getNode(result.pointer)).toEqual(result);
          expect(result.objectKind).toEqual(ObjectKind.Combination);
        });

        it(`Sets the type to ${expectedType}`, () => {
          expect(result.combinationType).toEqual(expectedType);
        });

        it('Adds the node to the specified target', () => {
          const parent = model.getNode(parentPointer) as FieldNode;
          expect(parent.children[index]).toEqual(result.pointer);
        });

        it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
      },
    );

    it('Adds an anyOf combination node to the end of the root node by default', () => {
      const model = schemaModel.deepClone();
      const name = 'newName';
      const result = model.addCombination(name);
      expect(model.getNode(result.pointer)).toEqual(result);
      expect(extractNameFromPointer(result.pointer)).toEqual(name);
      expect(result.objectKind).toEqual(ObjectKind.Combination);
      expect(result.combinationType).toEqual(CombinationKind.AnyOf);
      expect(last(model.getRootNode().children)).toBe(result.pointer);
      validateTestUiSchema(model.asArray());
    });

    it('Throws an error and keeps the model unchanged when a node with the same name already exists in the given parent node', () => {
      const model = schemaModel.deepClone();
      const name = extractNameFromPointer(stringNodeMock.pointer);
      expect(() => model.addCombination(name, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the given parent node is invalid', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: stringNodeMock.pointer, index: -1 };
      expect(() => model.addCombination('newName', target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('addReference', () => {
    const parentPointer = parentNodeMock.pointer;
    const index = 2;
    const target: NodePosition = { parentPointer, index };

    describe('When the parameters are valid', () => {
      const model = schemaModel.deepClone();
      const name = 'newName';
      const reference = extractNameFromPointer(defNodeMock.pointer);
      const result = model.addReference(name, reference, target);

      it('Adds a reference node', () => {
        expect(model.getNode(result.pointer)).toEqual(result);
        expect(result.objectKind).toEqual(ObjectKind.Reference);
      });

      it('Sets the reference', () => {
        expect(model.getReferredNode(result)).toEqual(defNodeMock);
      });

      it('Adds the node to the specified target', () => {
        const parent = model.getNode(parentPointer) as FieldNode;
        expect(parent.children[index]).toEqual(result.pointer);
      });

      it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
    });

    it('Throws an error and keeps the model unchanged when a node with the same name already exists in the given parent node', () => {
      const model = schemaModel.deepClone();
      const name = extractNameFromPointer(stringNodeMock.pointer);
      expect(() => model.addReference(name, defNodeMock.pointer, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the referenced node is not a definition', () => {
      const model = schemaModel.deepClone();
      const name = 'newName';
      const reference = extractNameFromPointer(stringNodeMock.pointer);
      expect(() => model.addReference(name, reference, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the given parent node is invalid', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: stringNodeMock.pointer, index: -1 };
      expect(() => model.addReference('newName', defNodeMock.pointer, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('addField', () => {
    describe.each(parentNodeTypes)('When adding to %s', (parentNodeType) => {
      describe.each([
        FieldType.Boolean,
        FieldType.Integer,
        FieldType.Null,
        FieldType.Number,
        FieldType.Object,
        FieldType.String,
        undefined,
      ])('When type is %s', (type) => {
        const { parentPointer, name } = addNodeTestData[parentNodeType];
        const index = 2;
        const target: NodePosition = { parentPointer, index };
        const model = schemaModel.deepClone();
        const result = model.addField(name, type, target);
        const expectedType: FieldType = type ?? FieldType.String;

        it('Adds a field node', () => {
          expect(model.getNode(result.pointer)).toEqual(result);
          expect(result.objectKind).toEqual(ObjectKind.Field);
        });

        it(`Sets the type to ${expectedType}`, () => {
          expect(result.fieldType).toEqual(expectedType);
        });

        it('Adds the node to the specified target', () => {
          const parent = model.getNode(parentPointer) as FieldNode;
          expect(parent.children[index]).toEqual(result.pointer);
        });

        it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
      });
    });

    it('Throws an error and keeps the model unchanged when a node with the same name already exists in the given parent node', () => {
      const model = schemaModel.deepClone();
      const name = extractNameFromPointer(stringNodeMock.pointer);
      const target: NodePosition = { parentPointer: parentNodeMock.pointer, index: -1 };
      expect(() => model.addField(name, FieldType.String, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the given parent node is invalid', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: stringNodeMock.pointer, index: -1 };
      expect(() => model.addField('newName', FieldType.String, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when adding to an object and no name is given', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: parentNodeMock.pointer, index: -1 };
      expect(() => model.addField(undefined, FieldType.String, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('addFieldType', () => {
    const model = schemaModel.deepClone();
    const name = 'newName';
    const result = model.addFieldType(name);

    it('Adds an object definition node', () => {
      expect(model.getNode(result.pointer)).toEqual(result);
      expect(result.objectKind).toEqual(ObjectKind.Field);
      expect(isDefinition(result)).toBe(true);
    });

    it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
  });

  describe('moveNode', () => {
    describe('When the given parent node is not a reference', () => {
      describe.each(parentNodeTypes)('When moving to %s', (parentNodeType) => {
        const model = schemaModel.deepClone();
        const { target, expectedNewPointer } = moveNodeTestData[parentNodeType];
        const { parentPointer, index } = target;
        const currentParent = model.getParentNode(simpleChildNodeMock.pointer);
        const movedNode = model.moveNode(simpleChildNodeMock.pointer, target);

        it('Moves the node to the new parent', () => {
          expect(movedNode).toBeDefined();
          expect(movedNode).toEqual({ ...simpleChildNodeMock, pointer: expectedNewPointer });
          expect(model.getParentNode(expectedNewPointer).pointer).toEqual(parentPointer);
        });

        it('Inserts the node at the correct index', () => {
          const newParent = model.getNode(parentPointer) as FieldNode;
          const childPointerAtExpectedIndex = newParent.children[index];
          const childAtExpectedIndex = model.getNode(childPointerAtExpectedIndex);
          expect(childAtExpectedIndex).toEqual({
            ...simpleChildNodeMock,
            pointer: childPointerAtExpectedIndex,
          });
        });

        it('Removes the node from the old parent', () => {
          expect(currentParent.children).not.toContain(simpleChildNodeMock.pointer);
        });

        it('Keeps the model valid', () => {
          validateTestUiSchema(model.asArray());
        });
      });

      describe.each(parentNodeTypes)(
        'When moving to a different index in the same %s',
        (parentNodeType) => {
          const model = schemaModel.deepClone();
          const { target } = moveNodeTestData[parentNodeType];
          const { parentPointer, index } = target;
          const parent = model.getNode(parentPointer) as FieldNode | CombinationNode;
          const numberOfChildren = parent.children.length;
          const currentPointerOfNodeToMove = parent.children[0];
          const nodeToMove = model.getNode(currentPointerOfNodeToMove);
          const setup = () => model.moveNode(currentPointerOfNodeToMove, target);

          it('Inserts the node at the correct index', () => {
            setup();
            const updatedChildren = model.getChildNodes(parentPointer);
            const updatedParent = model.getNode(parentPointer) as FieldNode | CombinationNode;
            const childAtExpectedIndex = updatedChildren[index];
            const childPointerAtExpectedIndex = updatedParent.children[index];
            expect(childAtExpectedIndex).toEqual({
              ...nodeToMove,
              pointer: childPointerAtExpectedIndex,
            });
          });

          it('Does not change the number of children', () => {
            setup();
            const updatedChildren = model.getChildNodes(parentPointer);
            expect(updatedChildren.length).toBe(numberOfChildren);
          });

          it('Keeps the model valid', () => {
            setup();
            validateTestUiSchema(model.asArray());
          });
        },
      );
    });

    describe('When the given parent node is a reference to an object', () => {
      const model = schemaModel.deepClone();
      const parentPointer = defNodeWithChildrenMock.pointer;
      const index = 1;
      const target: NodePosition = { parentPointer, index };
      const currentParent = model.getParentNode(stringNodeMock.pointer);
      const movedNode = model.moveNode(stringNodeMock.pointer, target);

      it('Moves the node to the referred object', () => {
        const expectedNewPointer = '#/$defs/parentDef/properties/stringNode';
        expect(movedNode).toBeDefined();
        expect(movedNode).toEqual({ ...stringNodeMock, pointer: expectedNewPointer });
        expect(model.getParentNode(expectedNewPointer).pointer).toEqual(parentPointer);
      });

      it('Inserts the node at the correct index', () => {
        const newParent = model.getNode(parentPointer) as FieldNode;
        const childPointerAtExpectedIndex = newParent.children[index];
        const childAtExpectedIndex = model.getNode(childPointerAtExpectedIndex);
        expect(childAtExpectedIndex).toEqual({
          ...stringNodeMock,
          pointer: childPointerAtExpectedIndex,
        });
      });

      it('Removes the node from the old parent', () => {
        expect(currentParent.children).not.toContain(stringNodeMock.pointer);
      });

      it('Keeps the model valid', () => {
        validateTestUiSchema(model.asArray());
      });
    });

    it('Throws an error and keeps the model unchanged when there is a node with same name in the target node', () => {
      const model = schemaModel.deepClone();
      const parentPointer = parentNodeMock.pointer;
      const index = 1;
      const target: NodePosition = { parentPointer, index };
      expect(() => model.moveNode(nodeWithSameNameAsStringNodeMock.pointer, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('updateNode', () => {
    it('Updates the node when there is no change in pointer', () => {
      const newNode = { ...stringNodeMock, title: 'new title' };
      const result = schemaModel.updateNode(stringNodeMock.pointer, newNode);
      expect(result.getNode(stringNodeMock.pointer)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the node map pointer', () => {
      const newPointer = '#/properties/test/properties/newName';
      const newNode = { ...stringNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(stringNodeMock.pointer, newNode);
      expect(result.getNode(newPointer)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in the parent node', () => {
      const newPointer = '#/properties/test/properties/newName';
      const newNode = { ...stringNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(stringNodeMock.pointer, newNode);
      const parent = result.getNode(parentNodeMock.pointer) as FieldNode;
      expect(parent.children).toContain(newPointer);
      expect(parent.children).not.toContain(stringNodeMock.pointer);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in referring nodes', () => {
      const newPointer = '#/$defs/newName';
      const newNode = { ...defNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(defNodeMock.pointer, newNode);
      const referringNode = result.getNode(referenceNodeMock.pointer) as ReferenceNode;
      expect(referringNode.reference).toEqual(newPointer);
      expect(model.getReferredNode(referringNode)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in child nodes', () => {
      const newPointer = '#/properties/newName';
      const newNode = { ...parentNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(parentNodeMock.pointer, newNode);
      const children = result.getChildNodes(newPointer);
      expect(children.map((child) => child.pointer)).toEqual([
        '#/properties/newName/properties/stringNode',
        '#/properties/newName/properties/numberNode',
        '#/properties/newName/properties/enumNode',
        '#/properties/newName/properties/arrayNode',
        '#/properties/newName/properties/optionalNode',
        '#/properties/newName/properties/requiredNode',
        '#/properties/newName/properties/referenceNode',
        '#/properties/newName/properties/subParent',
      ]);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in child nodes for a def node', () => {
      const newPointer = '#/$defs/newName';
      const newNode = { ...defNodeWithChildrenMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(defNodeWithChildrenMock.pointer, newNode);
      const children = result.getChildNodes(newPointer);
      expect(children.map((child) => child.pointer)).toEqual(['#/$defs/newName/properties/child']);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in grandchild nodes', () => {
      const newPointer = '#/properties/newName';
      const newNode = { ...parentNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(parentNodeMock.pointer, newNode);
      const expectedNewSubParentPointer = '#/properties/newName/properties/subParent';
      const subParent = result.getNode(expectedNewSubParentPointer) as FieldNode;
      expect(subParent.children).toContain(
        '#/properties/newName/properties/subParent/properties/subSubNode',
      );
      validateTestUiSchema(result.asArray());
    });
  });

  describe('deleteNode', () => {
    it('Deletes the given node from the map', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(stringNodeMock.pointer);
      expect(result.hasNode(stringNodeMock.pointer)).toBe(false);
      validateTestUiSchema(result.asArray());
    });

    it('Deletes the given node from the parent', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(stringNodeMock.pointer);
      const parent = result.getNode(parentNodeMock.pointer) as FieldNode;
      expect(parent.children).not.toContain(stringNodeMock.pointer);
      validateTestUiSchema(result.asArray());
    });

    it('Deletes children and grandchildren, but not siblings', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(parentNodeMock.pointer);
      expect(result.hasNode(parentNodeMock.pointer)).toBe(false);
      expect(result.hasNode(stringNodeMock.pointer)).toBe(false);
      expect(result.hasNode(subParentNodeMock.pointer)).toBe(false);
      expect(result.hasNode(subSubNodeMock.pointer)).toBe(false);
      expect(result.hasNode(allOfNodeMock.pointer)).toBe(true);
      expect(result.hasNode(defNodeMock.pointer)).toBe(true);
      expect(result.hasNode(simpleParentNodeMock.pointer)).toBe(true);
      validateTestUiSchema(result.asArray());
    });

    it('Removes the pointer from the parent node', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(stringNodeMock.pointer);
      const parent = result.getNode(parentNodeMock.pointer) as FieldNode;
      expect(parent.children).not.toContain(stringNodeMock.pointer);
      validateTestUiSchema(result.asArray());
    });

    it('Deletes the given node when it is an unused definition', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(unusedDefinitionMock.pointer);
      expect(result.hasNode(unusedDefinitionMock.pointer)).toBe(false);
      validateTestUiSchema(result.asArray());
    });

    it('Throws an error and keeps the model unchanged if trying to delete the root node', () => {
      const model = schemaModel.deepClone();
      expect(() => model.deleteNode(rootNodeMock.pointer)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged if trying to delete a definition node that is in use', () => {
      const model = schemaModel.deepClone();
      expect(() => model.deleteNode(defNodeMock.pointer)).toThrowError();
      expect(() => model.deleteNode(defNodeWithChildrenMock.pointer)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged if trying to delete a child node of a definition in use', () => {
      const model = schemaModel.deepClone();
      expect(() => model.deleteNode(defNodeWithChildrenChildMock.pointer)).toThrowError();
      expect(() => model.deleteNode(defNodeWithChildrenGrandchildMock.pointer)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('generateUniqueChildName', () => {
    it('Returns a unique name with the given prefix and does not change the schema', () => {
      const model = schemaModel.deepClone();
      const result = model.generateUniqueChildName(parentNodeMock.pointer, 'newName');
      expect(result).toBe('newName0');
      const newPointer = model.createChildPointer(parentNodeMock.pointer, result);
      expect(model.hasNode(newPointer)).toBe(false);
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Keeps returning unique names when fields with the generated names are added', () => {
      const model = schemaModel.deepClone();
      const prefix = 'newName';
      const parentPointer = parentNodeMock.pointer;
      const target: NodePosition = { parentPointer, index: -1 };
      const result = model.generateUniqueChildName(parentPointer, prefix);
      expect(result).toBe('newName0');
      model.addField(result, FieldType.String, target);
      const result2 = model.generateUniqueChildName(parentPointer, prefix);
      expect(result2).toBe('newName1');
      model.addField(result2, FieldType.String, target);
      const result3 = model.generateUniqueChildName(parentPointer, prefix);
      expect(result3).toBe('newName2');
      model.addField(result3, FieldType.String, target);
      validateTestUiSchema(model.asArray());
    });

    it('Returns prefix + 0 and does not change the model when run on a reference node', () => {
      const model = schemaModel.deepClone();
      const result = model.generateUniqueChildName(referenceNodeMock.pointer, 'newName');
      expect(result).toBe('newName0');
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Returns only the number when no prefix is given', () => {
      const model = schemaModel.deepClone();
      const result = model.generateUniqueChildName(referenceNodeMock.pointer);
      expect(result).toBe('0');
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('generateUniqueDefinitionName', () => {
    it('Returns a unique definition name with the given prefix and does not change the schema', () => {
      const model = schemaModel.deepClone();
      const result = model.generateUniqueDefinitionName('newName');
      expect(result).toBe('newName0');
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Keeps returning unique names when definitions with the generated names are added', () => {
      const model = schemaModel.deepClone();
      const prefix = 'newName';
      const result = model.generateUniqueDefinitionName(prefix);
      expect(result).toBe('newName0');
      model.addFieldType(result);
      const result2 = model.generateUniqueDefinitionName(prefix);
      expect(result2).toBe('newName1');
      model.addFieldType(result2);
      const result3 = model.generateUniqueDefinitionName(prefix);
      expect(result3).toBe('newName2');
      model.addFieldType(result3);
      validateTestUiSchema(model.asArray());
    });
  });

  describe('changeCombinationType', () => {
    it('Changes the combination type of the given node', () => {
      const model = schemaModel.deepClone();
      const newCombinationType = CombinationKind.AnyOf;
      const result = model.changeCombinationType(allOfNodeMock.pointer, newCombinationType);
      const updatedNode = result.getNode(allOfNodeMock.pointer) as CombinationNode;
      expect(updatedNode).toBeDefined();
      expect(updatedNode.combinationType).toEqual(newCombinationType);
      validateTestUiSchema(model.asArray());
    });

    it('Throws an error and keeps the model unchanged if the given node is not a combination node', () => {
      const model = schemaModel.deepClone();
      expect(() =>
        model.changeCombinationType(stringNodeMock.pointer, CombinationKind.AnyOf),
      ).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('toggleIsArray', () => {
    it('Changes isArray from false to true', () => {
      const model = schemaModel.deepClone();
      const { pointer } = parentNodeMock;
      model.toggleIsArray(pointer);
      const node = model.getNode(pointer);
      expect(isArray(node)).toBe(true);
      validateTestUiSchema(model.asArray());
    });

    it('Changes isArray from true to false', () => {
      const model = schemaModel.deepClone();
      const { pointer } = simpleArrayMock;
      model.toggleIsArray(pointer);
      const node = model.getNode(pointer);
      expect(isArray(node)).toBe(false);
      validateTestUiSchema(model.asArray());
    });
  });

  describe('isChildOfCombination', () => {
    it('Returns true when the given node is a direct child of a combination node', () => {
      expect(schemaModel.isChildOfCombination(allOfNodeChildMock.pointer)).toBe(true);
    });

    it('Returns false when the given node is not a direct child of a combination node', () => {
      expect(schemaModel.isChildOfCombination(simpleChildNodeMock.pointer)).toBe(false);
    });
  });

  describe('convertToDefinition', () => {
    it('Converts a field node to a reference with a definition with the same name', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = simpleParentNodeMock.pointer;
      const nodeName = extractNameFromPointer(pointerToConvert);
      const result = model.convertToDefinition(pointerToConvert);
      const convertedNode = result.getNode(pointerToConvert) as ReferenceNode;
      expect(convertedNode.objectKind).toEqual(ObjectKind.Reference);
      const referredNode = result.getReferredNode(convertedNode) as FieldNode;
      const referredNodeName = extractNameFromPointer(convertedNode.reference);
      expect(referredNodeName).toEqual(nodeName);
      expect(referredNode.fieldType).toEqual(FieldType.Object);
      validateTestUiSchema(model.asArray());
    });

    it('Converts a combinations node to a reference with a definition with the same name', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = allOfNodeMock.pointer;
      const nodeName = extractNameFromPointer(pointerToConvert);
      const result = model.convertToDefinition(pointerToConvert);
      const convertedNode = result.getNode(pointerToConvert) as ReferenceNode;
      expect(convertedNode.objectKind).toEqual(ObjectKind.Reference);
      const referredNode = result.getReferredNode(convertedNode) as CombinationNode;
      const referredNodeName = extractNameFromPointer(convertedNode.reference);
      expect(referredNodeName).toEqual(nodeName);
      expect(referredNode.combinationType).toEqual(CombinationKind.AllOf);
      validateTestUiSchema(model.asArray());
    });

    it('Creates a definition with a unique name when a definition with the same name as the converted node already exists', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = parentNodeMock.pointer;
      const nodeName = extractNameFromPointer(pointerToConvert);
      model.convertToDefinition(pointerToConvert);
      const convertedNode = model.getNode(pointerToConvert) as ReferenceNode;
      expect(convertedNode.objectKind).toEqual(ObjectKind.Reference);
      const referredNodeName = extractNameFromPointer(convertedNode.reference);
      expect(referredNodeName).not.toEqual(nodeName); // The name of the referred node is different from the name of the converted node
      expect(model.hasDefinition(nodeName)).toBe(true); // The definition with the same name still exists
      validateTestUiSchema(model.asArray());
    });

    it('Throws an error and keeps the model unchanged when the node to convert is already a definition', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = defNodeMock.pointer;
      expect(() => model.convertToDefinition(pointerToConvert)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the node to convert is already a reference', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = referenceNodeMock.pointer;
      expect(() => model.convertToDefinition(pointerToConvert)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });
});
