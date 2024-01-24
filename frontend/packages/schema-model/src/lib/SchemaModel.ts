import type { NodePosition, UiSchemaNode, UiSchemaNodes } from '../types';
import { CombinationKind, FieldType } from '../types';
import type { FieldNode } from '../types/FieldNode';
import type { CombinationNode } from '../types/CombinationNode';
import type { NodeMap } from '../types/NodeMap';
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
  moveArrayItem,
  removeItemByValue,
  replaceItemsByValue,
} from 'app-shared/utils/arrayUtils';
import { ROOT_POINTER } from './constants';
import type { ReferenceNode } from '../types/ReferenceNode';
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
import { convertPropToType } from './mutations/convert-node';
import { ArrayUtils } from '@studio/pure-functions';

export class SchemaModel {
  private readonly nodeMap: NodeMap;

  constructor(nodes: NodeMap) {
    this.nodeMap = nodes;
  }

  public static fromArray(nodes: UiSchemaNodes): SchemaModel {
    const map: NodeMap = new Map(nodes.map((node) => [node.pointer, node]));
    return new SchemaModel(map);
  }

  public getNodeMap(): NodeMap {
    return this.nodeMap;
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

  public getDefinition(name: string): UiSchemaNode {
    const pointer = createDefinitionPointer(name);
    return this.getNode(pointer);
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
    const node = this.getFinalNode(pointer);
    return this.getDirectChildNodes(node);
  }

  private getDirectChildNodes(node: FieldNode | CombinationNode): UiSchemaNodes {
    return node.children.map((childPointer) => this.getNode(childPointer));
  }

  public getReferredNode(node: ReferenceNode): UiSchemaNode {
    return this.getNode(node.reference);
  }

  /** Returns the node that the given node refers to, or the given node if it is not a reference. */
  public getFinalNode(pointer: string): FieldNode | CombinationNode {
    const node = this.getNode(pointer);
    return isReference(node) ? this.getFinalNode(node.reference) : node;
  }

  public getIndexOfChildNode(pointer: string): number {
    const parent = this.getParentNode(pointer);
    return parent.children.indexOf(pointer);
  }

  public doesNodeHaveChildWithName(nodePointer: string, name: string): boolean {
    const children = this.getChildNodes(nodePointer);
    return children.some((child) => extractNameFromPointer(child.pointer) === name);
  }

  public addCombination = (
    name?: string,
    target: NodePosition = defaultNodePosition,
    combinationType: CombinationKind = CombinationKind.AnyOf,
  ): CombinationNode => {
    const newNode: CombinationNode = { ...defaultCombinationNode, combinationType };
    return this.addNode<CombinationNode>(name, newNode, target);
  };

  public addReference = (
    name: string | undefined,
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
    name?: string,
    fieldType: FieldType = FieldType.String,
    target: NodePosition = defaultNodePosition,
  ): FieldNode => {
    const newNode: FieldNode = { ...defaultFieldNode, fieldType };
    return this.addNode<FieldNode>(name, newNode, target);
  };

  protected addNode<T extends UiSchemaNode>(
    name: string | undefined,
    node: T,
    target: NodePosition,
  ): T {
    const finalParent = this.getFinalNode(target.parentPointer);
    if (isCombination(finalParent)) {
      return this.addNodeToCombination(node, finalParent, target.index);
    } else {
      if (!name) throw new Error('Name is required when adding a node to an object.');
      return this.addNodeToObject(name, node, finalParent, target.index);
    }
  }

  private addNodeToCombination<T extends UiSchemaNode>(
    node: T,
    parentNode: CombinationNode,
    index: number,
  ): T {
    const finalIndex = index < 0 ? parentNode.children.length : index;
    const name = finalIndex.toString();
    const pointer = createPropertyPointer(parentNode, name);
    this.unshiftCombinationChildren(parentNode, finalIndex);
    const target: NodePosition = { parentPointer: parentNode.pointer, index };
    return this.addNodeToParentAndNodeMap(node, pointer, target);
  }

  private unshiftCombinationChildren = (node: CombinationNode, fromIndex: number): void => {
    const { children } = node;
    for (let i = children.length; i > fromIndex; i--) {
      const newName = i.toString();
      const newPointer = createPropertyPointer(node, newName);
      this.changePointer(children[i - 1], newPointer);
    }
  };

  private addNodeToParentAndNodeMap<T extends UiSchemaNode>(
    node: T,
    pointer: string,
    target: NodePosition,
  ): T {
    const newNode = { ...node, pointer, implicitType: false };
    this.addChildPointer(target, pointer);
    this.nodeMap.set(pointer, newNode);
    return newNode;
  }

  private addNodeToObject<T extends UiSchemaNode>(
    name: string,
    node: T,
    parent: FieldNode,
    index: number,
  ): T {
    const target = { index, parentPointer: parent.pointer };
    const pointer = this.createChildPointer(target.parentPointer, name);
    if (this.nodeMap.has(pointer)) throw new Error(`Node with pointer ${pointer} already exists.`);
    return this.addNodeToParentAndNodeMap(node, pointer, target);
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
    const fieldType = FieldType.Object;
    return this.addType<FieldNode>(name, { ...defaultFieldNode, fieldType, implicitType: false });
  };

  protected addType<T extends FieldNode | CombinationNode>(name: string, node: T): T {
    const pointer = createDefinitionPointer(name);
    if (this.nodeMap.has(pointer)) throw new Error(`Node with pointer ${pointer} already exists.`);
    const newNode = { ...node, pointer };
    const target = { parentPointer: ROOT_POINTER, index: -1 };
    this.addChildPointer(target, pointer);
    this.nodeMap.set(pointer, newNode);
    return newNode;
  }

  public moveNode(pointer: string, target: NodePosition): UiSchemaNode {
    const currentParentPointer = this.getParentNode(pointer).pointer;
    const finalParent = this.getFinalNode(target.parentPointer);
    const movedNode = isCombination(finalParent)
      ? this.moveNodeToCombination(pointer, finalParent, target.index)
      : this.moveNodeToObject(pointer, finalParent, target.index);
    const oldParent = this.getNode(currentParentPointer);
    if (isCombination(oldParent)) this.synchronizeCombinationChildPointers(oldParent);
    return movedNode;
  }

  private moveNodeToCombination = (
    pointer: string,
    parent: CombinationNode,
    index: number,
  ): UiSchemaNode => {
    const finalIndex = ArrayUtils.getValidIndex(parent.children, index);
    const currentParent = this.getParentNode(pointer);
    if (currentParent.pointer === parent.pointer) {
      const fromIndex = this.getIndexOfChildNode(pointer);
      return this.moveNodeWithinCombination(parent, fromIndex, finalIndex);
    } else {
      return this.moveNodeToCombinationFromAnotherParent(pointer, parent, finalIndex);
    }
  };

  private moveNodeWithinCombination = (
    parent: CombinationNode,
    fromIndex: number,
    toIndex: number,
  ): UiSchemaNode => {
    parent.children = moveArrayItem(parent.children, fromIndex, toIndex);
    this.synchronizeCombinationChildPointers(parent);
    return this.getNode(parent.children[toIndex]);
  };

  /** Updates the pointers of the children of the given combination node so that their names correspond to their index. */
  private synchronizeCombinationChildPointers = (parent: CombinationNode): SchemaModel => {
    const { children } = parent;
    const temporaryUniquePointers: string[] = [];
    children.forEach((childPointer, index) => {
      const newPointer = createPropertyPointer(parent, 'tmp' + index.toString());
      this.changePointer(childPointer, newPointer);
      temporaryUniquePointers.push(newPointer);
    });
    temporaryUniquePointers.forEach((childPointer, index) => {
      const newPointer = createPropertyPointer(parent, index.toString());
      this.changePointer(childPointer, newPointer);
    });
    return this;
  };

  private moveNodeToCombinationFromAnotherParent = (
    pointer: string,
    parent: CombinationNode,
    index: number,
  ): UiSchemaNode => {
    const name = index.toString();
    const newPointer = createPropertyPointer(parent, name);
    this.unshiftCombinationChildren(parent, index);
    const target: NodePosition = { parentPointer: parent.pointer, index };
    this.removeNodeFromParent(pointer);
    this.addChildPointer(target, newPointer);
    this.changePointer(pointer, newPointer);
    return this.getNode(newPointer);
  };

  private moveNodeToObject = (pointer: string, parent: FieldNode, index: number): UiSchemaNode => {
    const currentParent = this.getParentNode(pointer);
    return currentParent.pointer === parent.pointer
      ? this.moveNodeWithinObject(pointer, parent, index)
      : this.moveNodeToObjectFromAnotherParent(pointer, parent, index);
  };

  private moveNodeWithinObject = (
    pointer: string,
    parent: FieldNode,
    newIndex: number,
  ): UiSchemaNode => {
    const currentIndex = this.getIndexOfChildNode(pointer);
    parent.children = moveArrayItem(parent.children, currentIndex, newIndex);
    return this.getNode(parent.children[newIndex]);
  };

  private moveNodeToObjectFromAnotherParent = (
    pointer: string,
    parent: FieldNode,
    index: number,
  ): UiSchemaNode => {
    const nodeName = extractNameFromPointer(pointer);
    if (this.doesNodeHaveChildWithName(parent.pointer, nodeName)) {
      throw new Error(
        `Cannot move node to ${parent.pointer} because a child with name ${nodeName} already exists.`,
      );
    }
    const newPointer = this.createChildPointer(parent.pointer, nodeName);
    this.removeNodeFromParent(pointer);
    this.addChildPointer({ parentPointer: parent.pointer, index }, newPointer);
    this.changePointer(pointer, newPointer);
    return this.getNode(newPointer);
  };

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
    return this.deleteNodeWithChildrenRecursively(pointer);
  }

  private deleteNodeWithChildrenRecursively(pointer: string): SchemaModel {
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

  public hasReferringNodes(pointer: string): boolean {
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
        this.deleteNodeWithChildrenRecursively(childPointer);
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

  public convertToDefinition(pointer: string): SchemaModel {
    // TODO: Make this method independent of convertPropToType: https://github.com/Altinn/altinn-studio/issues/11841
    const newModel = convertPropToType(this.deepClone(), pointer);
    this.nodeMap.clear();
    newModel.getNodeMap().forEach((node) => this.nodeMap.set(node.pointer, node));
    return this;
  }
}

const defaultNodePosition: NodePosition = { parentPointer: ROOT_POINTER, index: -1 };
