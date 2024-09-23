import type { CombinationNode, FieldNode, NodePosition, UiSchemaNode } from '@altinn/schema-model';
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

  protected addNode<T extends UiSchemaNode>(name: string, node: T, target: NodePosition): T {
    const newNode: T = super.addNode<T>(name, node, target);
    this.save();
    return newNode;
  }

  protected addType<T extends FieldNode | CombinationNode>(name: string, node: T): T {
    const newNode: T = super.addType(name, node);
    this.save();
    return newNode;
  }

  public deleteNode(schemaPointer: string): SavableSchemaModel {
    super.deleteNode(schemaPointer);
    return this.save();
  }

  public convertToDefinition(schemaPointer: string): SavableSchemaModel {
    super.convertToDefinition(schemaPointer);
    return this.save();
  }

  public moveNode(schemaPointer: string, target: NodePosition): UiSchemaNode {
    const movedNode = super.moveNode(schemaPointer, target);
    this.save();
    return movedNode;
  }

  public updateNode(schemaPointer: string, newNode: UiSchemaNode): SavableSchemaModel {
    super.updateNode(schemaPointer, newNode);
    return this.save();
  }
}
