import type {
  CombinationKind,
  CombinationNode,
  FieldNode,
  FieldType,
  NodePosition,
  ReferenceNode,
  UiSchemaNode,
} from '@altinn/schema-model';
import { SchemaModel } from '@altinn/schema-model';

type SaveSchemaModel = (schema: SchemaModel) => void;

export class SavableSchemaModel extends SchemaModel {
  private readonly saveSchema: SaveSchemaModel;

  constructor(schemaModel: SchemaModel, saveSchema: SaveSchemaModel) {
    super(schemaModel.getNodeMap());
    this.saveSchema = saveSchema;
  }

  public save(): SavableSchemaModel {
    this.saveSchema(this);
    return this;
  }

  public addFieldAndSave(name?: string, fieldType?: FieldType, target?: NodePosition): FieldNode {
    const newField = this.addField(name, fieldType, target);
    this.save();
    return newField;
  }

  public addCombinationAndSave(
    name?: string,
    target?: NodePosition,
    combinationType?: CombinationKind,
  ): CombinationNode {
    const newCombination = this.addCombination(name, target, combinationType);
    this.save();
    return newCombination;
  }

  public addReferenceAndSave(
    name: string | undefined,
    referenceName: string,
    target?: NodePosition,
  ): ReferenceNode {
    const newReference = this.addReference(name, referenceName, target);
    this.save();
    return newReference;
  }

  public deleteNodeAndSave(schemaPointer: string): SavableSchemaModel {
    this.deleteNode(schemaPointer);
    return this.save();
  }

  public convertToDefinitionAndSave(schemaPointer: string): SavableSchemaModel {
    this.convertToDefinition(schemaPointer);
    return this.save();
  }

  public moveNodeAndSave(schemaPointer: string, target: NodePosition): UiSchemaNode {
    const movedNode = this.moveNode(schemaPointer, target);
    this.save();
    return movedNode;
  }
}
