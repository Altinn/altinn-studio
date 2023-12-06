import { CombinationKind, FieldType, NodePosition, UiSchemaNode, UiSchemaNodes } from '../types';
import { FieldNode } from '../types/FieldNode';
import { CombinationNode } from '../types/CombinationNode';
import { NodeMap } from '../types/NodeMap';
import {
  isCombination,
  isDefinition,
  isField,
  isFieldOrCombination,
  isNodeValidParent,
  isProperty,
  isReference,
} from './utils';
import {
  generateUniqueStringWithNumber,
  insertArrayElementAtPos,
  removeItemByValue,
  replaceItemsByValue,
} from 'app-shared/utils/arrayUtils';
import { ROOT_POINTER } from './constants';
import { ReferenceNode } from '../types/ReferenceNode';
import { deepCopy } from 'app-shared/pure';
import { replaceStart } from 'app-shared/utils/stringUtils';
import {
  createDefinitionPointer,
  createPropertyPointer,
  extractNameFromPointer,
} from './pointerUtils';
import {
  defaultCombinationNode,
  defaultFieldNode,
  defaultReferenceNode,
} from '../config/default-nodes';

export class SchemaModel {
  private readonly nodeMap: NodeMap;

  constructor(nodes: NodeMap) {
    this.nodeMap = nodes;
  }

  public static fromArray(nodes: UiSchemaNodes): SchemaModel {
    const map: NodeMap = new Map(nodes.map((node) => [node.pointer, node]));
    return new SchemaModel(map);
  }

  public deepClone(): SchemaModel {
    const nodes = deepCopy(this.asArray());
    return SchemaModel.fromArray(nodes);
  }

  public asArray(): UiSchemaNodes {
    return Array.from(this.nodeMap.values());
  }

  public isEmpty(): boolean {
    return this.nodeMap.size <= 1;
  }

  public getRootNode(): FieldNode {
    const rootNode = this.getNode(ROOT_POINTER);
    if (!isField(rootNode)) throw new Error('Root node is not a field.');
    return rootNode;
  }

  public getNode(pointer: string): UiSchemaNode {
    if (!this.hasNode(pointer)) throw new Error(`Node with pointer ${pointer} not found.`);
    return this.nodeMap.get(pointer);
  }

  public hasNode(pointer: string): boolean {
    return this.nodeMap.has(pointer);
  }

  public hasDefinition(name: string): boolean {
    const pointer = createDefinitionPointer(name);
    return this.hasNode(pointer);
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

  public getChildNodes(pointer: string): UiSchemaNodes {
    const node = this.getNode(pointer);
    return isReference(node) ? this.getChildNodes(node.reference) : this.getDirectChildNodes(node);
  }

  private getDirectChildNodes(node: FieldNode | CombinationNode): UiSchemaNodes {
    return node.children.map((childPointer) => this.getNode(childPointer));
  }

  public getReferredNode(node: ReferenceNode): UiSchemaNode | undefined {
    return this.getNode(node.reference);
  }

  public addCombination = (
    name: string,
    target: NodePosition = defaultNodePosition,
    combinationType: CombinationKind = CombinationKind.AnyOf,
  ): CombinationNode => {
    const newNode: CombinationNode = { ...defaultCombinationNode, combinationType };
    return this.addNode<CombinationNode>(name, newNode, target);
  };

  public addReference = (
    name: string,
    reference: string,
    target: NodePosition = defaultNodePosition,
  ): ReferenceNode => {
    const referencePointer = createDefinitionPointer(reference);
    if (!this.hasNode(referencePointer))
      throw new Error(`There is no definition named ${reference}.`);
    const newNode: ReferenceNode = { ...defaultReferenceNode, reference: referencePointer };
    return this.addNode<ReferenceNode>(name, newNode, target);
  };

  public addField = (
    name: string,
    fieldType: FieldType = FieldType.String,
    target: NodePosition = defaultNodePosition,
  ): FieldNode => {
    const newNode: FieldNode = { ...defaultFieldNode, fieldType };
    return this.addNode<FieldNode>(name, newNode, target);
  };

  private addNode<T extends UiSchemaNode>(name: string, node: T, target: NodePosition): T {
    const pointer = this.createChildPointer(target.parentPointer, name);
    if (this.nodeMap.has(pointer)) throw new Error(`Node with pointer ${pointer} already exists.`);
    const newNode = { ...node, pointer, implicitType: false };
    this.addChildPointer(target, pointer);
    this.nodeMap.set(pointer, newNode);
    return newNode;
  }

  public createChildPointer = (pointer: string, childName: string): string => {
    const node = this.getNode(pointer);
    return createPropertyPointer(node, childName);
  };

  private addChildPointer = (target: NodePosition, newPointer: string): void => {
    const parent = this.getNode(target.parentPointer) as FieldNode | CombinationNode;
    if (!isNodeValidParent(parent)) throw new Error('Invalid parent node.');
    parent.children = insertArrayElementAtPos(parent.children, newPointer, target.index);
  };

  public addFieldType = (name: string): FieldNode => {
    const fieldType = FieldType.String;
    return this.addType<FieldNode>(name, { ...defaultFieldNode, fieldType });
  };

  private addType<T extends FieldNode | CombinationNode>(name: string, node: T): T {
    const pointer = createDefinitionPointer(name);
    if (this.nodeMap.has(pointer)) throw new Error(`Node with pointer ${pointer} already exists.`);
    const newNode = { ...node, pointer };
    const target = { parentPointer: ROOT_POINTER, index: -1 };
    this.addChildPointer(target, pointer);
    this.nodeMap.set(pointer, newNode);
    return newNode;
  }

  public moveNode(pointer: string, target: NodePosition): SchemaModel {
    const nodeName = extractNameFromPointer(pointer);
    const newPointer = this.createChildPointer(target.parentPointer, nodeName);
    this.removeNodeFromParent(pointer);
    this.addChildPointer(target, newPointer);
    this.changePointer(pointer, newPointer);
    return this;
  }

  private removeNodeFromParent = (pointer: string): void => {
    const parent = this.getParentNode(pointer);
    parent.children = removeItemByValue(parent.children, pointer);
  };

  public getParentNode(pointer: string): FieldNode | CombinationNode | undefined {
    const isParent = (node: UiSchemaNode): node is FieldNode | CombinationNode =>
      isFieldOrCombination(node) && node.children.includes(pointer);
    return this.find<FieldNode | CombinationNode>(isParent);
  }

  public updateNode(pointer: string, newNode: UiSchemaNode): SchemaModel {
    this.updateNodeData(pointer, newNode);
    if (pointer !== newNode.pointer) {
      this.changePointer(pointer, newNode.pointer);
    }
    return this;
  }

  private updateNodeData(pointer: string, newNode: UiSchemaNode) {
    this.nodeMap.set(pointer, { ...newNode, pointer });
  }

  private changePointer(oldPointer: string, newPointer: string): void {
    this.changePointerInParent(oldPointer, newPointer);
    this.changePointerInReferences(oldPointer, newPointer);
    this.changePointerInMap(oldPointer, newPointer);
    this.changePointerInChildren(oldPointer, newPointer);
  }

  private changePointerInMap(oldPointer: string, newPointer: string): void {
    const oldNode = this.getNode(oldPointer);
    const newNode = { ...oldNode, pointer: newPointer };
    this.nodeMap.delete(oldPointer);
    this.nodeMap.set(newPointer, newNode);
  }

  private changePointerInParent(oldPointer: string, newPointer: string): void {
    const parentNode = this.getParentNode(oldPointer);
    if (parentNode) {
      const children = replaceItemsByValue(parentNode.children, oldPointer, newPointer);
      this.updateNodeData(parentNode.pointer, { ...parentNode, children });
    }
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

  private changePointerInReferences(oldPointer: string, newPointer: string): void {
    const referringNodes = this.getReferringNodes(oldPointer);
    referringNodes.forEach((node) =>
      this.updateNodeData(node.pointer, { ...node, reference: newPointer }),
    );
  }

  private getReferringNodes(pointer: string): ReferenceNode[] {
    const referringNodes: ReferenceNode[] = [];
    for (const node of this.nodeMap.values()) {
      if (isReference(node) && node.reference === pointer) {
        referringNodes.push(node);
      }
    }
    return referringNodes;
  }

  private changePointerInChildren(oldPointer: string, newPointer: string): void {
    const node = this.getNode(newPointer); // Expects the node map to be updated
    if (isFieldOrCombination(node) && node.children) {
      const makeNewPointer = (pointer: string) => replaceStart(pointer, oldPointer, newPointer);
      node.children.forEach((childPointer) => {
        const newPointer = makeNewPointer(childPointer);
        this.changePointer(childPointer, newPointer);
      });
    }
  }

  public deleteNode(pointer: string): SchemaModel {
    if (pointer === ROOT_POINTER) throw new Error('It is not possible to delete the root node.');
    if (this.isDefinitionInUse(pointer))
      throw new Error('Cannot delete a definition that is in use.');
    this.deleteChildren(pointer);
    this.removeNodeFromParent(pointer);
    this.nodeMap.delete(pointer);
    return this;
  }

  private isDefinitionInUse(pointer: string): boolean {
    const node = this.getNode(pointer);
    if (!isDefinition(node)) return false;
    return this.hasReferringNodes(pointer) || this.areDefinitionParentsInUse(pointer);
  }

  private hasReferringNodes(pointer: string): boolean {
    const referringNodes = this.getReferringNodes(pointer);
    return !!referringNodes.length;
  }

  private areDefinitionParentsInUse(pointer: string): boolean {
    const parent = this.getParentNode(pointer);
    return this.isDefinitionInUse(parent.pointer);
  }

  private deleteChildren(pointer: string): void {
    const node = this.getNode(pointer);
    if (isFieldOrCombination(node) && isNodeValidParent(node)) {
      node.children.forEach((childPointer) => {
        this.deleteNode(childPointer);
      });
    }
  }

  public generateUniqueChildName(pointer: string, namePrefix: string = ''): string | undefined {
    const node = this.getNode(pointer);
    const childPointers = isFieldOrCombination(node) ? node.children : [];
    const childNames = childPointers.map(extractNameFromPointer);
    return generateUniqueStringWithNumber(childNames, namePrefix);
  }

  public generateUniqueDefinitionName(namePrefix: string = ''): string {
    const definitions = this.getDefinitions();
    const definitionPointers = definitions.map((node) => node.pointer);
    const definitionNames = definitionPointers.map(extractNameFromPointer);
    return generateUniqueStringWithNumber(definitionNames, namePrefix);
  }

  public changeCombinationType(pointer: string, combinationType: CombinationKind): SchemaModel {
    const combinationNode = this.getNode(pointer);
    if (!isCombination(combinationNode)) throw Error(`${pointer} is not a combination.`);
    const newNode: CombinationNode = { ...combinationNode, combinationType };
    this.updateNodeData(pointer, newNode);
    this.updateChildPointers(newNode);
    return this;
  }

  public toggleIsArray(pointer: string): SchemaModel {
    const node = this.getNode(pointer);
    const newNode = { ...node, isArray: !node.isArray };
    this.updateNodeData(pointer, newNode);
    if (isFieldOrCombination(newNode) && isNodeValidParent(newNode)) {
      this.updateChildPointers(newNode);
    }
    return this;
  }

  private updateChildPointers(node: FieldNode | CombinationNode): void {
    const { children } = node;
    children.forEach((pointer) => {
      const nodeName = extractNameFromPointer(pointer);
      const newPointer = createPropertyPointer(node, nodeName);
      this.changePointer(pointer, newPointer);
    });
  }

  public isChildOfCombination(pointer: string): boolean {
    const parent = this.getParentNode(pointer);
    return !!parent && isCombination(parent);
  }
}

const defaultNodePosition: NodePosition = { parentPointer: ROOT_POINTER, index: -1 };
