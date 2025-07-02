import { SchemaModel } from './SchemaModel';
import {
  allOfNodeChildMock,
  allOfNodeMock,
  combinationDefNodeChild1Mock,
  combinationNodeWithMultipleChildrenMock,
  defNodeMock,
  defNodeWithChildrenChildMock,
  defNodeWithChildrenGrandchildMock,
  defNodeWithChildrenMock,
  nodeMockBase,
  nodeWithSameNameAsStringNodeMock,
  parentNodeMock,
  referenceNodeMock,
  referenceToCombinationDefNodeMock,
  referenceToObjectNodeMock,
  rootNodeMock,
  simpleArrayMock,
  simpleChildNodeMock,
  simpleParentNodeMock,
  stringNodeMock,
  subParentNodeMock,
  subSubNodeMock,
  uiSchemaMock,
  unusedDefinitionMock,
  simpleArrayItemsPointer,
  simpleArrayItemsMock,
  defNodeWithChildrenPointer,
} from '../../../test/uiSchemaMock';
import { expect } from '@jest/globals';
import { validateTestUiSchema } from '../../../test/validateTestUiSchema';
import type { NodePosition, UiSchemaNodes } from '../../types';
import { CombinationKind, FieldType, ObjectKind } from '../../types';
import type { FieldNode } from '../../types/FieldNode';
import type { ReferenceNode } from '../../types/ReferenceNode';
import { extractNameFromPointer } from '../pointerUtils';
import { isArray, isDefinition } from '../utils';
import { ROOT_POINTER, UNIQUE_POINTER_PREFIX } from '../constants';
import type { CombinationNode } from '../../types/CombinationNode';
import { ArrayUtils } from '@studio/pure-functions';

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
    parentPointer: parentNodeMock.schemaPointer,
    name: 'newName',
  },
  combination: {
    parentPointer: combinationNodeWithMultipleChildrenMock.schemaPointer,
    name: undefined,
  },
};

type MoveNodeTestData = {
  target: NodePosition;
  expectedNewPointer: string;
};
const moveNodeTestData: { [key in ParentNodeType]: MoveNodeTestData } = {
  object: {
    target: { parentPointer: parentNodeMock.schemaPointer, index: 1 },
    expectedNewPointer: '#/properties/test/properties/simpleChild',
  },
  combination: {
    target: { parentPointer: combinationNodeWithMultipleChildrenMock.schemaPointer, index: 1 },
    expectedNewPointer: '#/properties/combinationNodeWithMultipleChildren/anyOf/1',
  },
};

describe('SchemaModel', () => {
  describe('asArray', () => {
    it('Returns the nodes as an array', () => {
      expect(schemaModel.asArray()).toEqual(uiSchemaMock);
    });
  });

  describe('getNodeByUniquePointer', () => {
    it('Returns the node when unique pointer is the root', () => {
      const uniqueRootPointer = `${UNIQUE_POINTER_PREFIX}${rootNodeMock.schemaPointer}`;
      expect(schemaModel.getNodeByUniquePointer(uniqueRootPointer)).toEqual(rootNodeMock);
    });

    it('Returns the node when unique pointer is a property node', () => {
      const uniqueParentPointer = `${UNIQUE_POINTER_PREFIX}${parentNodeMock.schemaPointer}`;
      expect(schemaModel.getNodeByUniquePointer(uniqueParentPointer)).toEqual(parentNodeMock);
      const uniqueDefPointer = `${UNIQUE_POINTER_PREFIX}${defNodeMock.schemaPointer}`;
      expect(schemaModel.getNodeByUniquePointer(uniqueDefPointer)).toEqual(defNodeMock);
      const uniqueAllOfPointer = `${UNIQUE_POINTER_PREFIX}${allOfNodeMock.schemaPointer}`;
      expect(schemaModel.getNodeByUniquePointer(uniqueAllOfPointer)).toEqual(allOfNodeMock);
      const uniqueStringPointer = `${UNIQUE_POINTER_PREFIX}${stringNodeMock.schemaPointer}`;
      expect(schemaModel.getNodeByUniquePointer(uniqueStringPointer)).toEqual(stringNodeMock);
    });

    it('Returns the node reflecting the path to a given unique pointer in a reference', () => {
      const uniqueChildPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}/properties/referenceToParent/properties/child`;
      const uniqueGrandchildPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}/properties/referenceToParent/properties/child/properties/grandchild`;

      expect(schemaModel.getNodeByUniquePointer(uniqueChildPointer)).toEqual(
        defNodeWithChildrenChildMock,
      );
      expect(schemaModel.getNodeByUniquePointer(uniqueGrandchildPointer)).toEqual(
        defNodeWithChildrenGrandchildMock,
      );
    });
  });

  describe('getSchemaPointerByUniquePointer', () => {
    const uniqueGrandChildPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}/properties/referenceToParent/properties/child/properties/grandchild`;
    const uniqueChildPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}/properties/referenceToParent/properties/child`;

    it('Returns the schema pointer for a given unique pointer', () => {
      expect(schemaModel.getSchemaPointerByUniquePointer(uniqueChildPointer)).toEqual(
        defNodeWithChildrenChildMock.schemaPointer,
      );
      expect(schemaModel.getSchemaPointerByUniquePointer(uniqueGrandChildPointer)).toEqual(
        defNodeWithChildrenGrandchildMock.schemaPointer,
      );
    });

    it('Returns the schema pointer for a given unique pointer to a combination', () => {
      const uniquePointer = '#/properties/referenceToCombinationDef/oneOf/0';
      const expectedResult = combinationDefNodeChild1Mock.schemaPointer;
      const result = schemaModel.getSchemaPointerByUniquePointer(uniquePointer);
      expect(result).toEqual(expectedResult);
    });

    it('returns the schema pointer for a given unique array items pointer', () => {
      const uniquePointer = '#/properties/simpleArray/items/properties/simpleChild';
      const expectedResult = simpleArrayItemsMock.schemaPointer;

      const result = schemaModel.getSchemaPointerByUniquePointer(uniquePointer);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUniquePointer', () => {
    it('Returns the unique pointer when called on the root node', () => {
      const expectedUniqueRootPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}`;
      expect(SchemaModel.getUniquePointer(rootNodeMock.schemaPointer)).toEqual(
        expectedUniqueRootPointer,
      );
    });

    it('Returns the unique pointer when called on a property node', () => {
      const expectedUniquePointer = `${UNIQUE_POINTER_PREFIX}${referenceToObjectNodeMock.schemaPointer}`;

      expect(SchemaModel.getUniquePointer(referenceToObjectNodeMock.schemaPointer)).toEqual(
        expectedUniquePointer,
      );
    });

    it('Handles items pointer category correctly in getUniquePointer', () => {
      const schemaPointer = simpleArrayItemsMock.schemaPointer;
      const uniqueParentPointer = `${UNIQUE_POINTER_PREFIX}#/properties/simpleArray`;
      const expected = `${UNIQUE_POINTER_PREFIX}#/properties/simpleArray/items/properties/simpleChild`;

      const result = SchemaModel.getUniquePointer(schemaPointer, uniqueParentPointer);
      expect(result).toEqual(expected);
    });

    it('Returns a unique pointer reflecting the path to a given node in a reference to an object', () => {
      const expectedUniqueChildPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}/properties/referenceToParent/properties/child`;
      const expectedUniqueGrandchildPointer = `${UNIQUE_POINTER_PREFIX}${ROOT_POINTER}/properties/referenceToParent/properties/child/properties/grandchild`;

      expect(
        SchemaModel.getUniquePointer(
          defNodeWithChildrenChildMock.schemaPointer,
          referenceToObjectNodeMock.schemaPointer,
        ),
      ).toEqual(expectedUniqueChildPointer);
      expect(
        SchemaModel.getUniquePointer(
          defNodeWithChildrenGrandchildMock.schemaPointer,
          expectedUniqueChildPointer,
        ),
      ).toEqual(expectedUniqueGrandchildPointer);
    });

    it('Returns a pointer reflecting the path to a given node in a reference to a combination', () => {
      const { schemaPointer } = combinationDefNodeChild1Mock;
      const uniquePointerOfParent = referenceToCombinationDefNodeMock.schemaPointer;
      const result = SchemaModel.getUniquePointer(schemaPointer, uniquePointerOfParent);
      const expectedResult = `${UNIQUE_POINTER_PREFIX}#/properties/referenceToCombinationDef/oneOf/0`;
      expect(result).toEqual(expectedResult);
    });
  });

  describe('areDefinitionParentsInUse', () => {
    it('Returns false if definition parent not in use', () => {
      const result = schemaModel.areDefinitionParentsInUse(unusedDefinitionMock.schemaPointer);
      expect(result).toBeFalsy();
    });

    it('Returns true if definition parent is in use', () => {
      const result = schemaModel.areDefinitionParentsInUse(
        defNodeWithChildrenChildMock.schemaPointer,
      );
      expect(result).toBeTruthy();
    });
  });

  describe('addCombination', () => {
    const parentPointer = parentNodeMock.schemaPointer;
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
          expect(model.getNodeBySchemaPointer(result.schemaPointer)).toEqual(result);
          expect(result.objectKind).toEqual(ObjectKind.Combination);
        });

        it(`Sets the type to ${expectedType}`, () => {
          expect(result.combinationType).toEqual(expectedType);
        });

        it('Adds the node to the specified target', () => {
          const parent = model.getNodeBySchemaPointer(parentPointer) as FieldNode;
          expect(parent.children[index]).toEqual(result.schemaPointer);
        });

        it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
      },
    );

    it('Adds an anyOf combination node to the end of the root node by default', () => {
      const model = schemaModel.deepClone();
      const name = 'newName';
      const result = model.addCombination(name);
      expect(model.getNodeBySchemaPointer(result.schemaPointer)).toEqual(result);
      expect(extractNameFromPointer(result.schemaPointer)).toEqual(name);
      expect(result.objectKind).toEqual(ObjectKind.Combination);
      expect(result.combinationType).toEqual(CombinationKind.AnyOf);
      expect(ArrayUtils.last(model.getRootNode().children)).toBe(result.schemaPointer);
      validateTestUiSchema(model.asArray());
    });

    it('Throws an error and keeps the model unchanged when a node with the same name already exists in the given parent node', () => {
      const model = schemaModel.deepClone();
      const name = extractNameFromPointer(stringNodeMock.schemaPointer);
      expect(() => model.addCombination(name, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the given parent node is invalid', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: stringNodeMock.schemaPointer, index: -1 };
      expect(() => model.addCombination('newName', target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('addReference', () => {
    const parentPointer = parentNodeMock.schemaPointer;
    const index = 2;
    const target: NodePosition = { parentPointer, index };

    describe('When the parameters are valid', () => {
      const model = schemaModel.deepClone();
      const name = 'newName';
      const reference = extractNameFromPointer(defNodeMock.schemaPointer);
      const result = model.addReference(name, reference, target);

      it('Adds a reference node', () => {
        expect(model.getNodeBySchemaPointer(result.schemaPointer)).toEqual(result);
        expect(result.objectKind).toEqual(ObjectKind.Reference);
      });

      it('Sets the reference', () => {
        expect(model.getReferredNode(result)).toEqual(defNodeMock);
      });

      it('Adds the node to the specified target', () => {
        const parent = model.getNodeBySchemaPointer(parentPointer) as FieldNode;
        expect(parent.children[index]).toEqual(result.schemaPointer);
      });

      it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
    });

    it('Throws an error and keeps the model unchanged when a node with the same name already exists in the given parent node', () => {
      const model = schemaModel.deepClone();
      const name = extractNameFromPointer(stringNodeMock.schemaPointer);
      expect(() => model.addReference(name, defNodeMock.schemaPointer, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the referenced node is not a definition', () => {
      const model = schemaModel.deepClone();
      const name = 'newName';
      const reference = extractNameFromPointer(stringNodeMock.schemaPointer);
      expect(() => model.addReference(name, reference, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the given parent node is invalid', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: stringNodeMock.schemaPointer, index: -1 };
      expect(() => model.addReference('newName', defNodeMock.schemaPointer, target)).toThrowError();
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
          expect(model.getNodeBySchemaPointer(result.schemaPointer)).toEqual(result);
          expect(result.objectKind).toEqual(ObjectKind.Field);
        });

        it(`Sets the type to ${expectedType}`, () => {
          expect(result.fieldType).toEqual(expectedType);
        });

        it('Adds the node to the specified target', () => {
          const parent = model.getNodeBySchemaPointer(parentPointer) as FieldNode;
          expect(parent.children[index]).toEqual(result.schemaPointer);
        });

        it('Keeps the model valid', () => validateTestUiSchema(model.asArray()));
      });
    });

    it('Throws an error and keeps the model unchanged when a node with the same name already exists in the given parent node', () => {
      const model = schemaModel.deepClone();
      const name = extractNameFromPointer(stringNodeMock.schemaPointer);
      const target: NodePosition = { parentPointer: parentNodeMock.schemaPointer, index: -1 };
      expect(() => model.addField(name, FieldType.String, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the given parent node is invalid', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: stringNodeMock.schemaPointer, index: -1 };
      expect(() => model.addField('newName', FieldType.String, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when adding to an object and no name is given', () => {
      const model = schemaModel.deepClone();
      const target: NodePosition = { parentPointer: parentNodeMock.schemaPointer, index: -1 };
      expect(() => model.addField(undefined, FieldType.String, target)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('addFieldType', () => {
    const model = schemaModel.deepClone();
    const name = 'newName';
    const result = model.addFieldType(name);

    it('Adds an object definition node', () => {
      expect(model.getNodeBySchemaPointer(result.schemaPointer)).toEqual(result);
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
        const currentParent = model.getParentNode(simpleChildNodeMock.schemaPointer);
        const movedNode = model.moveNode(simpleChildNodeMock.schemaPointer, target);

        it('Moves the node to the new parent', () => {
          expect(movedNode).toBeDefined();
          expect(movedNode).toEqual({ ...simpleChildNodeMock, schemaPointer: expectedNewPointer });
          expect(model.getParentNode(expectedNewPointer).schemaPointer).toEqual(parentPointer);
        });

        it('Inserts the node at the correct index', () => {
          const newParent = model.getNodeBySchemaPointer(parentPointer) as FieldNode;
          const childPointerAtExpectedIndex = newParent.children[index];
          const childAtExpectedIndex = model.getNodeBySchemaPointer(childPointerAtExpectedIndex);
          expect(childAtExpectedIndex).toEqual({
            ...simpleChildNodeMock,
            schemaPointer: childPointerAtExpectedIndex,
          });
        });

        it('Removes the node from the old parent', () => {
          expect(currentParent.children).not.toContain(simpleChildNodeMock.schemaPointer);
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
          const parent = model.getNodeBySchemaPointer(parentPointer) as FieldNode | CombinationNode;
          const numberOfChildren = parent.children.length;
          const currentPointerOfNodeToMove = parent.children[0];
          const nodeToMove = model.getNodeBySchemaPointer(currentPointerOfNodeToMove);
          const setup = () => model.moveNode(currentPointerOfNodeToMove, target);

          it('Inserts the node at the correct index', () => {
            setup();
            const updatedChildren = model.getChildNodes(parentPointer);
            const updatedParent = model.getNodeBySchemaPointer(parentPointer) as
              | FieldNode
              | CombinationNode;
            const childAtExpectedIndex = updatedChildren[index];
            const childPointerAtExpectedIndex = updatedParent.children[index];
            expect(childAtExpectedIndex).toEqual({
              ...nodeToMove,
              schemaPointer: childPointerAtExpectedIndex,
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
      const parentPointer = defNodeWithChildrenMock.schemaPointer;
      const index = 1;
      const target: NodePosition = { parentPointer, index };
      const currentParent = model.getParentNode(stringNodeMock.schemaPointer);
      const movedNode = model.moveNode(stringNodeMock.schemaPointer, target);

      it('Moves the node to the referred object', () => {
        const expectedNewPointer = '#/$defs/parentDef/properties/stringNode';
        expect(movedNode).toBeDefined();
        expect(movedNode).toEqual({ ...stringNodeMock, schemaPointer: expectedNewPointer });
        expect(model.getParentNode(expectedNewPointer).schemaPointer).toEqual(parentPointer);
      });

      it('Inserts the node at the correct index', () => {
        const newParent = model.getNodeBySchemaPointer(parentPointer) as FieldNode;
        const childPointerAtExpectedIndex = newParent.children[index];
        const childAtExpectedIndex = model.getNodeBySchemaPointer(childPointerAtExpectedIndex);
        expect(childAtExpectedIndex).toEqual({
          ...stringNodeMock,
          schemaPointer: childPointerAtExpectedIndex,
        });
      });

      it('Removes the node from the old parent', () => {
        expect(currentParent.children).not.toContain(stringNodeMock.schemaPointer);
      });

      it('Keeps the model valid', () => {
        validateTestUiSchema(model.asArray());
      });
    });

    it('Throws an error and keeps the model unchanged when there is a node with same name in the target node', () => {
      const model = schemaModel.deepClone();
      const parentPointer = parentNodeMock.schemaPointer;
      const index = 1;
      const target: NodePosition = { parentPointer, index };
      expect(() =>
        model.moveNode(nodeWithSameNameAsStringNodeMock.schemaPointer, target),
      ).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('updateNode', () => {
    it('Updates the node when there is no change in pointer', () => {
      const newNode = { ...stringNodeMock, title: 'new title' };
      const result = schemaModel.updateNode(stringNodeMock.schemaPointer, newNode);
      expect(result.getNodeBySchemaPointer(stringNodeMock.schemaPointer)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the node map pointer', () => {
      const newPointer = '#/properties/test/properties/newName';
      const newNode = { ...stringNodeMock, schemaPointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(stringNodeMock.schemaPointer, newNode);
      expect(result.getNodeBySchemaPointer(newPointer)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in the parent node', () => {
      const newPointer = '#/properties/test/properties/newName';
      const newNode = { ...stringNodeMock, schemaPointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(stringNodeMock.schemaPointer, newNode);
      const parent = result.getNodeBySchemaPointer(parentNodeMock.schemaPointer) as FieldNode;
      expect(parent.children).toContain(newPointer);
      expect(parent.children).not.toContain(stringNodeMock.schemaPointer);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in referring nodes', () => {
      const newPointer = '#/$defs/newName';
      const newNode = { ...defNodeMock, schemaPointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(defNodeMock.schemaPointer, newNode);
      const referringNode = result.getNodeBySchemaPointer(
        referenceNodeMock.schemaPointer,
      ) as ReferenceNode;
      expect(referringNode.reference).toEqual(newPointer);
      expect(model.getReferredNode(referringNode)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in child nodes', () => {
      const newPointer = '#/properties/newName';
      const newNode = { ...parentNodeMock, schemaPointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(parentNodeMock.schemaPointer, newNode);
      const children = result.getChildNodes(newPointer);
      expect(children.map((child) => child.schemaPointer)).toEqual([
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
      const newNode = { ...defNodeWithChildrenMock, schemaPointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(defNodeWithChildrenMock.schemaPointer, newNode);
      const children = result.getChildNodes(newPointer);
      expect(children.map((child) => child.schemaPointer)).toEqual([
        '#/$defs/newName/properties/child',
      ]);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in grandchild nodes', () => {
      const newPointer = '#/properties/newName';
      const newNode = { ...parentNodeMock, schemaPointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(parentNodeMock.schemaPointer, newNode);
      const expectedNewSubParentPointer = '#/properties/newName/properties/subParent';
      const subParent = result.getNodeBySchemaPointer(expectedNewSubParentPointer) as FieldNode;
      expect(subParent.children).toContain(
        '#/properties/newName/properties/subParent/properties/subSubNode',
      );
      validateTestUiSchema(result.asArray());
    });
  });

  describe('deleteNode', () => {
    it('Deletes the given node from the map', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(stringNodeMock.schemaPointer);
      expect(result.hasNode(stringNodeMock.schemaPointer)).toBe(false);
      validateTestUiSchema(result.asArray());
    });

    it('Deletes the given node from the parent', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(stringNodeMock.schemaPointer);
      const parent = result.getNodeBySchemaPointer(parentNodeMock.schemaPointer) as FieldNode;
      expect(parent.children).not.toContain(stringNodeMock.schemaPointer);
      validateTestUiSchema(result.asArray());
    });

    it('Deletes children and grandchildren, but not siblings', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(parentNodeMock.schemaPointer);
      expect(result.hasNode(parentNodeMock.schemaPointer)).toBe(false);
      expect(result.hasNode(stringNodeMock.schemaPointer)).toBe(false);
      expect(result.hasNode(subParentNodeMock.schemaPointer)).toBe(false);
      expect(result.hasNode(subSubNodeMock.schemaPointer)).toBe(false);
      expect(result.hasNode(allOfNodeMock.schemaPointer)).toBe(true);
      expect(result.hasNode(defNodeMock.schemaPointer)).toBe(true);
      expect(result.hasNode(simpleParentNodeMock.schemaPointer)).toBe(true);
      validateTestUiSchema(result.asArray());
    });

    it('Removes the pointer from the parent node', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(stringNodeMock.schemaPointer);
      const parent = result.getNodeBySchemaPointer(parentNodeMock.schemaPointer) as FieldNode;
      expect(parent.children).not.toContain(stringNodeMock.schemaPointer);
      validateTestUiSchema(result.asArray());
    });

    it('Deletes the given node when it is an unused definition', () => {
      const model = schemaModel.deepClone();
      const result = model.deleteNode(unusedDefinitionMock.schemaPointer);
      expect(result.hasNode(unusedDefinitionMock.schemaPointer)).toBe(false);
      validateTestUiSchema(result.asArray());
    });

    it('Throws an error and keeps the model unchanged if trying to delete the root node', () => {
      const model = schemaModel.deepClone();
      expect(() => model.deleteNode(rootNodeMock.schemaPointer)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged if trying to delete a definition node that is in use', () => {
      const model = schemaModel.deepClone();
      expect(() => model.deleteNode(defNodeMock.schemaPointer)).toThrowError();
      expect(() => model.deleteNode(defNodeWithChildrenMock.schemaPointer)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Should not throw an error if trying to delete a child node of a definition in use', () => {
      const model = schemaModel.deepClone();
      expect(() => model.deleteNode(defNodeWithChildrenChildMock.schemaPointer)).not.toThrowError();
      expect(model.asArray()).not.toEqual(schemaModel.asArray());
    });
  });

  describe('generateUniqueChildName', () => {
    it('Returns a unique name with the given prefix and does not change the schema', () => {
      const model = schemaModel.deepClone();
      const result = model.generateUniqueChildName(parentNodeMock.schemaPointer, 'newName');
      expect(result).toBe('newName0');
      const newPointer = model.createChildPointer(parentNodeMock.schemaPointer, result);
      expect(model.hasNode(newPointer)).toBe(false);
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Keeps returning unique names when fields with the generated names are added', () => {
      const model = schemaModel.deepClone();
      const prefix = 'newName';
      const parentPointer = parentNodeMock.schemaPointer;
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
      const result = model.generateUniqueChildName(referenceNodeMock.schemaPointer, 'newName');
      expect(result).toBe('newName0');
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Returns only the number when no prefix is given', () => {
      const model = schemaModel.deepClone();
      const result = model.generateUniqueChildName(referenceNodeMock.schemaPointer);
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
      const result = model.changeCombinationType(allOfNodeMock.schemaPointer, newCombinationType);
      const updatedNode = result.getNodeBySchemaPointer(
        allOfNodeMock.schemaPointer,
      ) as CombinationNode;
      expect(updatedNode).toBeDefined();
      expect(updatedNode.combinationType).toEqual(newCombinationType);
      validateTestUiSchema(model.asArray());
    });

    it('Throws an error and keeps the model unchanged if the given node is not a combination node', () => {
      const model = schemaModel.deepClone();
      expect(() =>
        model.changeCombinationType(stringNodeMock.schemaPointer, CombinationKind.AnyOf),
      ).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });

  describe('toggleIsArray', () => {
    it('Changes isArray from false to true', () => {
      const model = schemaModel.deepClone();
      const { schemaPointer } = parentNodeMock;
      model.toggleIsArray(schemaPointer);
      const node = model.getNodeBySchemaPointer(schemaPointer);
      expect(isArray(node)).toBe(true);
      validateTestUiSchema(model.asArray());
    });

    it('Changes isArray from true to false', () => {
      const model = schemaModel.deepClone();
      const { schemaPointer } = simpleArrayMock;
      model.toggleIsArray(schemaPointer);
      const node = model.getNodeBySchemaPointer(schemaPointer);
      expect(isArray(node)).toBe(false);
      validateTestUiSchema(model.asArray());
    });
  });

  describe('isChildOfCombination', () => {
    it('Returns true when the given node is a direct child of a combination node', () => {
      expect(schemaModel.isChildOfCombination(allOfNodeChildMock.schemaPointer)).toBe(true);
    });

    it('Returns false when the given node is not a direct child of a combination node', () => {
      expect(schemaModel.isChildOfCombination(simpleChildNodeMock.schemaPointer)).toBe(false);
    });

    it('Returns false when the root node is a combination, but the given node is a definition', () => {
      const definitionPointer = '#/$defs/test';
      const rootNode: CombinationNode = {
        ...rootNodeMock,
        objectKind: ObjectKind.Combination,
        combinationType: CombinationKind.AnyOf,
        children: [definitionPointer],
      };
      const definitionNode: FieldNode = {
        ...nodeMockBase,
        objectKind: ObjectKind.Field,
        fieldType: FieldType.Object,
        schemaPointer: definitionPointer,
        children: [],
      };
      const nodes: UiSchemaNodes = [rootNode, definitionNode];
      validateTestUiSchema(nodes);
      const model = SchemaModel.fromArray(nodes);
      expect(model.isChildOfCombination(definitionPointer)).toBe(false);
    });
  });

  describe('convertToDefinition', () => {
    it('Converts a field node to a reference with a definition with the same name', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = simpleParentNodeMock.schemaPointer;
      const nodeName = extractNameFromPointer(pointerToConvert);
      const result = model.convertToDefinition(pointerToConvert);
      const convertedNode = result.getNodeBySchemaPointer(pointerToConvert) as ReferenceNode;
      expect(convertedNode.objectKind).toEqual(ObjectKind.Reference);
      const referredNode = result.getReferredNode(convertedNode) as FieldNode;
      const referredNodeName = extractNameFromPointer(convertedNode.reference);
      expect(referredNodeName).toEqual(nodeName);
      expect(referredNode.fieldType).toEqual(FieldType.Object);
      validateTestUiSchema(model.asArray());
    });

    it('Converts a combinations node to a reference with a definition with the same name', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = allOfNodeMock.schemaPointer;
      const nodeName = extractNameFromPointer(pointerToConvert);
      const result = model.convertToDefinition(pointerToConvert);
      const convertedNode = result.getNodeBySchemaPointer(pointerToConvert) as ReferenceNode;
      expect(convertedNode.objectKind).toEqual(ObjectKind.Reference);
      const referredNode = result.getReferredNode(convertedNode) as CombinationNode;
      const referredNodeName = extractNameFromPointer(convertedNode.reference);
      expect(referredNodeName).toEqual(nodeName);
      expect(referredNode.combinationType).toEqual(CombinationKind.AllOf);
      validateTestUiSchema(model.asArray());
    });

    it('Creates a definition with a unique name when a definition with the same name as the converted node already exists', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = parentNodeMock.schemaPointer;
      const nodeName = extractNameFromPointer(pointerToConvert);
      model.convertToDefinition(pointerToConvert);
      const convertedNode = model.getNodeBySchemaPointer(pointerToConvert) as ReferenceNode;
      expect(convertedNode.objectKind).toEqual(ObjectKind.Reference);
      const referredNodeName = extractNameFromPointer(convertedNode.reference);
      expect(referredNodeName).not.toEqual(nodeName); // The name of the referred node is different from the name of the converted node
      expect(model.hasDefinition(nodeName)).toBe(true); // The definition with the same name still exists
      validateTestUiSchema(model.asArray());
    });

    it('Throws an error and keeps the model unchanged when the node to convert is already a definition', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = defNodeMock.schemaPointer;
      expect(() => model.convertToDefinition(pointerToConvert)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });

    it('Throws an error and keeps the model unchanged when the node to convert is already a reference', () => {
      const model = schemaModel.deepClone();
      const pointerToConvert = referenceNodeMock.schemaPointer;
      expect(() => model.convertToDefinition(pointerToConvert)).toThrowError();
      expect(model.asArray()).toEqual(schemaModel.asArray());
    });
  });
});
