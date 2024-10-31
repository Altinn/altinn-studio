import { ROOT_POINTER } from '../constants';
import { FieldType, type NodePosition, ObjectKind } from '../../types';
import { SchemaModel } from './SchemaModel';
import type { FieldNode } from '../../types/FieldNode';
import { nodeMockBase } from '../../../test/uiSchemaMock';

describe('CircularReferenceDetector', () => {
  describe('willResultInCircularReferences', () => {
    it('Returns false when there are no types involved', () => {
      const model = createCleanModel();
      const field = model.addField('name');
      const childPointer = field.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, ROOT_POINTER);
      expect(result).toBe(false);
    });

    it('Returns false when the parent is not referred by the child', () => {
      const model = createCleanModel();
      const defName = 'def';
      const def = model.addFieldType(defName);
      model.addReference('ref', defName);
      const object = model.addField('object', FieldType.Object);
      const childPointer = def.schemaPointer;
      const parentPointer = object.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(false);
    });

    it('Returns true when the child node and the parent node are the same', () => {
      const model = createCleanModel();
      const def = model.addFieldType('def');
      const childPointer = def.schemaPointer;
      const parentPointer = def.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });

    it('Returns true when the parent node is a reference to the child node', () => {
      const model = createCleanModel();
      const defName = 'def';
      const def = model.addFieldType(defName);
      const ref = model.addReference('ref', defName);
      const childPointer = def.schemaPointer;
      const parentPointer = ref.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });

    it('Returns true when the parent node is a child of the child node', () => {
      const model = createCleanModel();
      const defName = 'def';
      const def = model.addFieldType(defName);
      const objectTarget: NodePosition = { parentPointer: def.schemaPointer, index: -1 };
      const object = model.addField('object', FieldType.Object, objectTarget);
      const childPointer = def.schemaPointer;
      const parentPointer = object.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });

    it('Returns true when the child node contains a reference to the parent node', () => {
      const model = createCleanModel();
      const defName = 'def';
      model.addFieldType(defName);
      const rootRef = model.addReference('ref', defName);
      const object = model.addField('object', FieldType.Object);
      model.addReference('ref', defName, { parentPointer: object.schemaPointer, index: -1 });
      const parentPointer = rootRef.schemaPointer;
      const childPointer = object.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });

    it('Returns true when the child node contains an object with a reference to the parent node', () => {
      const model = createCleanModel();
      const defName = 'def';
      model.addFieldType(defName);
      const rootRef = model.addReference('ref', defName);
      const firstLevelObject = model.addField('object', FieldType.Object);
      const secondLevelObject = model.addField('object', FieldType.Object, {
        parentPointer: firstLevelObject.schemaPointer,
        index: -1,
      });
      model.addReference('ref', defName, {
        parentPointer: secondLevelObject.schemaPointer,
        index: -1,
      });
      const parentPointer = rootRef.schemaPointer;
      const childPointer = firstLevelObject.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });

    it('Returns true when the child node contains a reference with a reference to the parent node', () => {
      const model = createCleanModel();

      const object = model.addField('object', FieldType.Object);

      const firstLevelDefName = 'firstLevelDef';
      const firstLevelDef = model.addFieldType(firstLevelDefName);
      model.addReference('ref', firstLevelDefName, {
        parentPointer: object.schemaPointer,
        index: -1,
      });

      const secondLevelDefName = 'secondLevelDef';
      const secondLevelDef = model.addFieldType(secondLevelDefName);
      model.addReference('ref', secondLevelDefName, {
        parentPointer: firstLevelDef.schemaPointer,
        index: -1,
      });

      const parentPointer = secondLevelDef.schemaPointer;
      const childPointer = object.schemaPointer;

      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });

    it('Returns true when the parent node is an object within the node referred by the child node', () => {
      const model = createCleanModel();

      const defName = 'def';
      const def = model.addFieldType(defName);
      const ref = model.addReference('ref', defName);

      const object = model.addField('object', FieldType.Object, {
        parentPointer: def.schemaPointer,
        index: -1,
      });

      const parentPointer = object.schemaPointer;
      const childPointer = ref.schemaPointer;
      const result = model.willResultInCircularReferences(childPointer, parentPointer);
      expect(result).toBe(true);
    });
  });
});

function createCleanModel(): SchemaModel {
  const rootNode: FieldNode = {
    ...nodeMockBase,
    schemaPointer: ROOT_POINTER,
    objectKind: ObjectKind.Field,
    fieldType: FieldType.Object,
    children: [],
  };
  return SchemaModel.fromArray([rootNode]);
}
