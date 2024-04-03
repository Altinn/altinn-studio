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

  public deleteNode(pointer: string): SavableSchemaModel {
    super.deleteNode(pointer);
    return this.save();
  }

  public convertToDefinition(pointer: string): SavableSchemaModel {
    super.convertToDefinition(pointer);
    return this.save();
  }

  public moveNode(pointer: string, target: NodePosition): UiSchemaNode {
    const movedNode = super.moveNode(pointer, target);
    this.save();
    return movedNode;
  }

  public updateNode(pointer: string, newNode: UiSchemaNode): SavableSchemaModel {
    super.updateNode(pointer, newNode);
    return this.save();
  }
}
