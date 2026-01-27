import { SavableSchemaModel } from './SavableSchemaModel';
import type { NodePosition } from '@altinn/schema-model';
import { extractNameFromPointer, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import {
  uiSchemaNodesMock,
  definitionNodeMock,
  fieldNode1Mock,
} from '../../test/mocks/uiSchemaMock';

describe('SavableSchemaModel', () => {
  const save = jest.fn();
  const schemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
  const setupSchema = (): SavableSchemaModel => {
    const schemaClone = schemaModel.deepClone();
    return new SavableSchemaModel(schemaClone, save);
  };

  afterEach(jest.clearAllMocks);

  describe('addFieldAndSave', () => {
    it('Adds a field, saves the model once and returns the new node', () => {
      const savableSchema = setupSchema();
      const name = 'field';
      const field = savableSchema.addFieldAndSave(name);
      expect(savableSchema.hasNode(field.schemaPointer)).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(savableSchema);
    });
  });

  describe('addCombinationAndSave', () => {
    it('Adds a combination, saves the model once and returns the new node', () => {
      const savableSchema = setupSchema();
      const name = 'combination';
      const combination = savableSchema.addCombinationAndSave(name);
      expect(savableSchema.hasNode(combination.schemaPointer)).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(savableSchema);
    });
  });

  describe('addReferenceAndSave', () => {
    it('Adds a reference, saves the model once and returns the new node', () => {
      const savableSchema = setupSchema();
      const name = 'reference';
      const referenceName = extractNameFromPointer(definitionNodeMock.schemaPointer);
      const reference = savableSchema.addReferenceAndSave(name, referenceName);
      expect(savableSchema.hasNode(reference.schemaPointer)).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(savableSchema);
    });
  });

  describe('deleteNodeAndSave', () => {
    it('Deletes a node, saves the model once and returns the object', () => {
      const savableSchema = setupSchema();
      const { schemaPointer } = fieldNode1Mock;
      const result = savableSchema.deleteNodeAndSave(schemaPointer);
      expect(savableSchema.hasNode(schemaPointer)).toBe(false);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(savableSchema);
      expect(result).toBe(savableSchema);
    });
  });

  describe('convertToDefinitionAndSave', () => {
    it('Converts a node to a definition, saves the model once and returns the object', () => {
      const savableSchema = setupSchema();
      const { schemaPointer } = fieldNode1Mock;
      const name = extractNameFromPointer(schemaPointer);
      const result = savableSchema.convertToDefinitionAndSave(schemaPointer);
      expect(savableSchema.hasDefinition(name)).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(savableSchema);
      expect(result).toBe(savableSchema);
    });
  });

  describe('moveNodeAndSave', () => {
    it('Moves a node, saves the model once and returns the moved node', () => {
      const savableSchema = setupSchema();
      const { schemaPointer } = fieldNode1Mock;
      const name = extractNameFromPointer(schemaPointer);
      const target: NodePosition = {
        parentPointer: ROOT_POINTER,
        index: -1,
      };
      const movedNode = savableSchema.moveNodeAndSave(schemaPointer, target);
      expect(savableSchema.doesNodeHaveChildWithName(ROOT_POINTER, name)).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(savableSchema);
      expect(movedNode).toBe(savableSchema.getNodeBySchemaPointer(movedNode.schemaPointer));
    });
  });
});
