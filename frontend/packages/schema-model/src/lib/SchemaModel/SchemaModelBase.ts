import { type UiSchemaNode, type UiSchemaNodes } from '../../types';
import type { FieldNode } from '../../types/FieldNode';
import type { CombinationNode } from '../../types/CombinationNode';
import type { NodeMap } from '../../types/NodeMap';
import { isDefinition, isFieldOrCombination, isProperty, isReference } from '../utils';
import { ROOT_POINTER } from '../constants';
import type { ReferenceNode } from '../../types/ReferenceNode';
import { createDefinitionPointer, extractNameFromPointer } from '../pointerUtils';

export class SchemaModelBase {
  protected readonly nodeMap: NodeMap;

  constructor(nodes: NodeMap) {
    this.nodeMap = nodes;
  }

  public getNodeMap(): NodeMap {
    return this.nodeMap;
  }

  public getRootNode(): FieldNode | CombinationNode {
    const rootNode = this.getNodeBySchemaPointer(ROOT_POINTER);
    if (!isFieldOrCombination(rootNode))
      throw new Error('Root node is not a field nor a combination.');
    return rootNode;
  }

  public getNodeBySchemaPointer(schemaPointer: string): UiSchemaNode {
    if (!this.hasNode(schemaPointer))
      throw new Error(`Node with pointer ${schemaPointer} not found.`);
    return this.nodeMap.get(schemaPointer);
  }

  public hasNode(schemaPointer: string): boolean {
    return this.nodeMap.has(schemaPointer);
  }

  public hasDefinition(name: string): boolean {
    const schemaPointer = createDefinitionPointer(name);
    return this.hasNode(schemaPointer);
  }

  public getDefinition(name: string): UiSchemaNode {
    const schemaPointer = createDefinitionPointer(name);
    return this.getNodeBySchemaPointer(schemaPointer);
  }

  public getDefinitions(): UiSchemaNodes {
    return this.getRootChildren().filter(isDefinition);
  }

  public getRootProperties(): UiSchemaNodes {
    return this.getRootChildren().filter(isProperty);
  }

  public getRootChildren(): UiSchemaNodes {
    return this.getChildNodes(ROOT_POINTER);
  }

  public getChildNodes(schemaPointer: string): UiSchemaNodes {
    const node = this.getFinalNode(schemaPointer);
    return this.getDirectChildNodes(node);
  }

  private getDirectChildNodes(node: FieldNode | CombinationNode): UiSchemaNodes {
    return node.children.map((childPointer) => this.getNodeBySchemaPointer(childPointer));
  }

  public getReferredNode(node: ReferenceNode): UiSchemaNode {
    return this.getNodeBySchemaPointer(node.reference);
  }

  /** Returns the node that the given node refers to, or the given node if it is not a reference. */
  public getFinalNode(schemaPointer: string): FieldNode | CombinationNode {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    return isReference(node) ? this.getFinalNode(node.reference) : node;
  }

  public getIndexOfChildNode(schemaPointer: string): number {
    const parent = this.getParentNode(schemaPointer);
    return parent.children.indexOf(schemaPointer);
  }

  public doesNodeHaveChildWithName(nodePointer: string, name: string): boolean {
    const children = this.getChildNodes(nodePointer);
    return children.some((child) => extractNameFromPointer(child.schemaPointer) === name);
  }

  public getParentNode(schemaPointer: string): FieldNode | CombinationNode | undefined {
    const isParent = (node: UiSchemaNode): node is FieldNode | CombinationNode =>
      isFieldOrCombination(node) && node.children.includes(schemaPointer);
    return this.find<FieldNode | CombinationNode>(isParent);
  }

  private find<T extends UiSchemaNode>(
    predicate: (node: UiSchemaNode) => node is T,
  ): T | undefined {
    for (const node of this.nodeMap.values()) {
      if (predicate(node)) {
        return node;
      }
    }
  }

  protected getReferringNodes(schemaPointer: string): ReferenceNode[] {
    const referringNodes: ReferenceNode[] = [];
    for (const node of this.nodeMap.values()) {
      if (isReference(node) && node.reference === schemaPointer) {
        referringNodes.push(node);
      }
    }

    return referringNodes;
  }

  public hasReferringNodes(schemaPointer: string): boolean {
    const referringNodes = this.getReferringNodes(schemaPointer);
    return !!referringNodes.length;
  }
}
