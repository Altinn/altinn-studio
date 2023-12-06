import { SchemaModel } from './SchemaModel';
import {
  allOfNodeChildMock,
  allOfNodeMock,
  arrayNodeMock,
  defNodeMock,
  defNodeWithChildrenChildMock,
  defNodeWithChildrenGrandchildMock,
  defNodeWithChildrenMock,
  enumNodeMock,
  numberNodeMock,
  optionalNodeMock,
  parentNodeMock,
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
} from '../../test/uiSchemaMock';
import { expect } from '@jest/globals';
import { validateTestUiSchema } from '../../test/validateTestUiSchema';
import { CombinationKind, FieldType, NodePosition, ObjectKind } from '../types';
import { FieldNode } from '../types/FieldNode';
import { ReferenceNode } from '../types/ReferenceNode';
import { extractNameFromPointer } from './pointerUtils';
import { isArray, isDefinition } from './utils';
import { ROOT_POINTER } from './constants';
import { CombinationNode } from '../types/CombinationNode';
import { last } from 'app-shared/utils/arrayUtils';

const schemaModel = SchemaModel.fromArray(uiSchemaMock);

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

    it('Throws an error if the root node is not a field node', () => {
      const invalidRootNode = { ...allOfNodeMock, pointer: ROOT_POINTER };
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
      expect(result).toEqual([defNodeMock, defNodeWithChildrenMock, unusedDefinitionMock]);
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
    const parentPointer = parentNodeMock.pointer;
    const index = 2;
    const target: NodePosition = { parentPointer, index };

    describe.each([
      FieldType.Boolean,
      FieldType.Integer,
      FieldType.Null,
      FieldType.Number,
      FieldType.Object,
      FieldType.String,
      undefined,
    ])('When type is %s', (type) => {
      const model = schemaModel.deepClone();
      const name = 'newName';
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
    const model = schemaModel.deepClone();
    const parentPointer = allOfNodeMock.pointer;
    const index = 1;
    const target: NodePosition = { parentPointer, index };
    const currentParent = model.getParentNode(stringNodeMock.pointer);
    const result = model.moveNode(stringNodeMock.pointer, target);

    it('Moves the node to the new parent', () => {
      const expectedNewPointer = '#/properties/allOfNode/allOf/stringNode';
      const movedNode = result.getNode(expectedNewPointer);
      expect(movedNode).toBeDefined();
      expect(movedNode).toEqual({ ...stringNodeMock, pointer: expectedNewPointer });
      expect(result.getParentNode(expectedNewPointer).pointer).toEqual(parentPointer);
    });

    it('Inserts the node at the correct index', () => {
      const newParent = result.getNode(parentPointer) as FieldNode;
      const childPointerAtExpectedIndex = newParent.children[index];
      const childAtExpectedIndex = result.getNode(childPointerAtExpectedIndex);
      expect(childAtExpectedIndex).toEqual({
        ...stringNodeMock,
        pointer: childPointerAtExpectedIndex,
      });
    });

    it('Removes the node from the old parent', () => {
      expect(currentParent.children).not.toContain(stringNodeMock.pointer);
    });

    it('Keeps the model valid', () => validateTestUiSchema(result.asArray()));
  });

  describe('updateNode', () => {
    it('Updates the node when there is no change in pointer', () => {
      const newNode = { ...stringNodeMock, title: 'new title' };
      const result = schemaModel.updateNode(stringNodeMock.pointer, newNode);
      expect(result.getNode(stringNodeMock.pointer)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the node map pointer', () => {
      const newPointer = '#/properties/test/anyOf/newName';
      const newNode = { ...stringNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(stringNodeMock.pointer, newNode);
      expect(result.getNode(newPointer)).toEqual(newNode);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in the parent node', () => {
      const newPointer = '#/properties/test/anyOf/newName';
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
        '#/properties/newName/anyOf/stringNode',
        '#/properties/newName/anyOf/numberNode',
        '#/properties/newName/anyOf/enumNode',
        '#/properties/newName/anyOf/arrayNode',
        '#/properties/newName/anyOf/optionalNode',
        '#/properties/newName/anyOf/requiredNode',
        '#/properties/newName/anyOf/referenceNode',
        '#/properties/newName/anyOf/subParent',
      ]);
      validateTestUiSchema(result.asArray());
    });

    it('Updates the pointer in grandchild nodes', () => {
      const newPointer = '#/properties/newName';
      const newNode = { ...parentNodeMock, pointer: newPointer };
      const model = schemaModel.deepClone();
      const result = model.updateNode(parentNodeMock.pointer, newNode);
      const expectedNewSubParentPointer = '#/properties/newName/anyOf/subParent';
      const subParent = result.getNode(expectedNewSubParentPointer) as FieldNode;
      expect(subParent.children).toContain(
        '#/properties/newName/anyOf/subParent/properties/subSubNode',
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
});
