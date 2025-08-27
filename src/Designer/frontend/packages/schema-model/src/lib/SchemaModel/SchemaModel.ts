import {
  CombinationKind,
  FieldType,
  Keyword,
  type NodePosition,
  type UiSchemaNode,
  type UiSchemaNodes,
} from '../../types';
import type { FieldNode } from '../../types/FieldNode';
import type { CombinationNode } from '../../types/CombinationNode';
import type { NodeMap } from '../../types/NodeMap';
import {
  isCombination,
  isDefinition,
  isDefinitionPointer,
  isFieldOrCombination,
  isNodeValidParent,
  isReference,
} from '../utils';
import { ROOT_POINTER, UNIQUE_POINTER_PREFIX } from '../constants';
import type { ReferenceNode } from '../../types/ReferenceNode';
import { ObjectUtils, ArrayUtils, StringUtils } from '@studio/pure-functions';
import {
  createDefinitionPointer,
  createPropertyPointer,
  extractCategoryFromPointer,
  extractNameFromPointer,
  makePointerFromArray,
} from '../pointerUtils';
import {
  defaultCombinationNode,
  defaultFieldNode,
  defaultReferenceNode,
} from '../../config/default-nodes';
import { convertPropToType } from '../mutations/convert-node';
import { SchemaModelBase } from './SchemaModelBase';
import { CircularReferenceDetector } from './CircularReferenceDetector';

export class SchemaModel extends SchemaModelBase {
  constructor(nodes: NodeMap) {
    super(nodes);
  }

  public static fromArray(nodes: UiSchemaNodes): SchemaModel {
    const map: NodeMap = new Map(nodes.map((node) => [node.schemaPointer, node]));
    return new SchemaModel(map);
  }

  public deepClone(): SchemaModel {
    const nodes = ObjectUtils.deepCopy(this.asArray());
    return SchemaModel.fromArray(nodes);
  }

  public asArray(): UiSchemaNodes {
    return Array.from(this.nodeMap.values());
  }

  public getNodeByUniquePointer(uniquePointer: string): UiSchemaNode {
    const schemaPointer = this.getSchemaPointerByUniquePointer(uniquePointer);
    return this.getNodeBySchemaPointer(schemaPointer);
  }

  public getSchemaPointerByUniquePointer(uniquePointer: string): string {
    const pointer = SchemaModel.removeUniquePointerPrefix(uniquePointer);
    if (this.hasNode(pointer)) return pointer;

    const parentSchemaPointer = this.getParentSchemaPointerByUniquePointer(pointer);

    return makePointerFromArray([
      parentSchemaPointer,
      extractCategoryFromPointer(uniquePointer),
      extractNameFromPointer(uniquePointer),
    ]);
  }

  private getParentSchemaPointerByUniquePointer(uniquePointer: string): string {
    const parentPropertyNode = this.getParentPropertyNodeByUniquePointer(uniquePointer);
    return isReference(parentPropertyNode)
      ? parentPropertyNode.reference
      : parentPropertyNode.schemaPointer;
  }

  private getParentPropertyNodeByUniquePointer(uniquePointer: string): UiSchemaNode {
    const parentUniquePointer = this.getParentUniquePointer(uniquePointer);
    return this.getNodeByUniquePointer(parentUniquePointer);
  }

  public getParentUniquePointer(uniquePointer: string): string {
    const parts = uniquePointer.split('/');
    const partsWithoutName = ArrayUtils.removeLast(parts);
    const partsWithoutItemCategory = ArrayUtils.removeLast(partsWithoutName);
    const lastPart = ArrayUtils.last(partsWithoutItemCategory);
    const finalParts =
      lastPart === Keyword.Items
        ? ArrayUtils.removeLast(partsWithoutItemCategory)
        : partsWithoutItemCategory;

    return finalParts.join('/');
  }

  private static removeUniquePointerPrefix(uniquePointer: string): string {
    return StringUtils.removeStart(uniquePointer, UNIQUE_POINTER_PREFIX);
  }

  public static getUniquePointer(schemaPointer: string, uniqueParentPointer?: string): string {
    if (!uniqueParentPointer || !isDefinitionPointer(schemaPointer))
      return `${UNIQUE_POINTER_PREFIX}${schemaPointer}`;

    const category = extractCategoryFromPointer(schemaPointer);
    const parentPointer = SchemaModel.removeUniquePointerPrefix(uniqueParentPointer);

    return `${UNIQUE_POINTER_PREFIX}${parentPointer}/${category}/${extractNameFromPointer(schemaPointer)}`;
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
    const schemaPointer = createPropertyPointer(parentNode, name);
    this.unshiftCombinationChildren(parentNode, finalIndex);
    const target: NodePosition = { parentPointer: parentNode.schemaPointer, index };
    return this.addNodeToParentAndNodeMap(node, schemaPointer, target);
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
    schemaPointer: string,
    target: NodePosition,
  ): T {
    const newNode = { ...node, schemaPointer, implicitType: false };
    this.addChildPointer(target, schemaPointer);
    this.nodeMap.set(schemaPointer, newNode);
    return newNode;
  }

  private addNodeToObject<T extends UiSchemaNode>(
    name: string,
    node: T,
    parent: FieldNode,
    index: number,
  ): T {
    const target = { index, parentPointer: parent.schemaPointer };
    const schemaPointer = this.createChildPointer(target.parentPointer, name);
    if (this.nodeMap.has(schemaPointer))
      throw new Error(`Node with pointer ${schemaPointer} already exists.`);
    return this.addNodeToParentAndNodeMap(node, schemaPointer, target);
  }

  public createChildPointer = (schemaPointer: string, childName: string): string => {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    return createPropertyPointer(node, childName);
  };

  private addChildPointer = (target: NodePosition, newPointer: string): void => {
    const parent = this.getNodeBySchemaPointer(target.parentPointer) as FieldNode | CombinationNode;
    if (!isNodeValidParent(parent)) throw new Error('Invalid parent node.');
    parent.children = ArrayUtils.insertArrayElementAtPos(parent.children, newPointer, target.index);
  };

  public addFieldType = (name: string): FieldNode => {
    const fieldType = FieldType.Object;
    return this.addType<FieldNode>(name, { ...defaultFieldNode, fieldType, implicitType: false });
  };

  protected addType<T extends FieldNode | CombinationNode>(name: string, node: T): T {
    const schemaPointer = createDefinitionPointer(name);
    if (this.nodeMap.has(schemaPointer))
      throw new Error(`Node with pointer ${schemaPointer} already exists.`);
    const newNode = { ...node, schemaPointer };
    const target = { parentPointer: ROOT_POINTER, index: -1 };
    this.addChildPointer(target, schemaPointer);
    this.nodeMap.set(schemaPointer, newNode);
    return newNode;
  }

  public moveNode(schemaPointer: string, target: NodePosition): UiSchemaNode {
    const currentParentPointer = this.getParentNode(schemaPointer).schemaPointer;
    const finalParent = this.getFinalNode(target.parentPointer);
    const movedNode = isCombination(finalParent)
      ? this.moveNodeToCombination(schemaPointer, finalParent, target.index)
      : this.moveNodeToObject(schemaPointer, finalParent, target.index);
    const oldParent = this.getNodeBySchemaPointer(currentParentPointer);
    if (isCombination(oldParent)) this.synchronizeCombinationChildPointers(oldParent);
    return movedNode;
  }

  private moveNodeToCombination = (
    schemaPointer: string,
    parent: CombinationNode,
    index: number,
  ): UiSchemaNode => {
    const currentParent = this.getParentNode(schemaPointer);
    if (currentParent.schemaPointer === parent.schemaPointer) {
      const fromIndex = this.getIndexOfChildNode(schemaPointer);
      return this.moveNodeWithinCombination(parent, fromIndex, index);
    } else {
      return this.moveNodeToCombinationFromAnotherParent(schemaPointer, parent, index);
    }
  };

  private moveNodeWithinCombination = (
    parent: CombinationNode,
    fromIndex: number,
    toIndex: number,
  ): UiSchemaNode => {
    const finalIndex = ArrayUtils.getValidIndex(parent.children, toIndex);
    parent.children = ArrayUtils.moveArrayItem(parent.children, fromIndex, finalIndex);
    this.synchronizeCombinationChildPointers(parent);
    return this.getNodeBySchemaPointer(parent.children[toIndex]);
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
    schemaPointer: string,
    parent: CombinationNode,
    index: number,
  ): UiSchemaNode => {
    const name = index.toString();
    const newPointer = createPropertyPointer(parent, name);
    this.unshiftCombinationChildren(parent, index);
    const target: NodePosition = { parentPointer: parent.schemaPointer, index };
    this.removeNodeFromParent(schemaPointer);
    this.addChildPointer(target, newPointer);
    this.changePointer(schemaPointer, newPointer);
    return this.getNodeBySchemaPointer(newPointer);
  };

  private moveNodeToObject = (
    schemaPointer: string,
    parent: FieldNode,
    index: number,
  ): UiSchemaNode => {
    const currentParent = this.getParentNode(schemaPointer);
    return currentParent.schemaPointer === parent.schemaPointer
      ? this.moveNodeWithinObject(schemaPointer, parent, index)
      : this.moveNodeToObjectFromAnotherParent(schemaPointer, parent, index);
  };

  private moveNodeWithinObject = (
    schemaPointer: string,
    parent: FieldNode,
    newIndex: number,
  ): UiSchemaNode => {
    const currentIndex = this.getIndexOfChildNode(schemaPointer);
    const finalIndex = ArrayUtils.getValidIndex(parent.children, newIndex);
    parent.children = ArrayUtils.moveArrayItem(parent.children, currentIndex, finalIndex);
    return this.getNodeBySchemaPointer(parent.children[finalIndex]);
  };

  private moveNodeToObjectFromAnotherParent = (
    schemaPointer: string,
    parent: FieldNode,
    index: number,
  ): UiSchemaNode => {
    const nodeName = extractNameFromPointer(schemaPointer);
    if (this.doesNodeHaveChildWithName(parent.schemaPointer, nodeName)) {
      throw new Error(
        `Cannot move node to ${parent.schemaPointer} because a child with name ${nodeName} already exists.`,
      );
    }
    const newPointer = this.createChildPointer(parent.schemaPointer, nodeName);
    this.removeNodeFromParent(schemaPointer);
    this.addChildPointer({ parentPointer: parent.schemaPointer, index }, newPointer);
    this.changePointer(schemaPointer, newPointer);
    return this.getNodeBySchemaPointer(newPointer);
  };

  private removeNodeFromParent = (schemaPointer: string): void => {
    const parent = this.getParentNode(schemaPointer);
    parent.children = ArrayUtils.removeItemByValue(parent.children, schemaPointer);
  };

  public updateNode(schemaPointer: string, newNode: UiSchemaNode): SchemaModel {
    this.updateNodeData(schemaPointer, newNode);
    if (schemaPointer !== newNode.schemaPointer) {
      this.changePointer(schemaPointer, newNode.schemaPointer);
    }
    return this;
  }

  private updateNodeData(schemaPointer: string, newNode: UiSchemaNode) {
    this.nodeMap.set(schemaPointer, { ...newNode, schemaPointer });
  }

  private changePointer(oldPointer: string, newPointer: string): void {
    this.changePointerInParent(oldPointer, newPointer);
    this.changePointerInReferences(oldPointer, newPointer);
    this.changePointerInMap(oldPointer, newPointer);
    this.changePointerInChildren(oldPointer, newPointer);
  }

  private changePointerInMap(oldPointer: string, newPointer: string): void {
    const oldNode = this.getNodeBySchemaPointer(oldPointer);
    const newNode = { ...oldNode, schemaPointer: newPointer };
    this.nodeMap.delete(oldPointer);
    this.nodeMap.set(newPointer, newNode);
  }

  private changePointerInParent(oldPointer: string, newPointer: string): void {
    const parentNode = this.getParentNode(oldPointer);
    if (parentNode) {
      const children = ArrayUtils.replaceItemsByValue(parentNode.children, oldPointer, newPointer);
      this.updateNodeData(parentNode.schemaPointer, { ...parentNode, children });
    }
  }

  private changePointerInReferences(oldPointer: string, newPointer: string): void {
    const referringNodes = this.getReferringNodes(oldPointer);
    referringNodes.forEach((node) =>
      this.updateNodeData(node.schemaPointer, { ...node, reference: newPointer }),
    );
  }

  private changePointerInChildren(oldPointer: string, newPointer: string): void {
    const node = this.getNodeBySchemaPointer(newPointer); // Expects the node map to be updated
    if (isFieldOrCombination(node) && node.children) {
      const makeNewPointer = (schemaPointer: string) =>
        StringUtils.replaceStart(schemaPointer, oldPointer, newPointer);
      node.children.forEach((childPointer) => {
        const newPointer = makeNewPointer(childPointer);
        this.changePointer(childPointer, newPointer);
      });
    }
  }

  public deleteNode(schemaPointer: string): SchemaModel {
    if (schemaPointer === ROOT_POINTER)
      throw new Error('It is not possible to delete the root node.');
    if (this.hasReferringNodes(schemaPointer))
      throw new Error('Cannot delete a definition that is in use.');
    return this.deleteNodeWithChildrenRecursively(schemaPointer);
  }

  private deleteNodeWithChildrenRecursively(schemaPointer: string): SchemaModel {
    this.deleteChildren(schemaPointer);
    this.removeNodeFromParent(schemaPointer);
    this.nodeMap.delete(schemaPointer);
    return this;
  }

  private isDefinitionInUse(schemaPointer: string): boolean {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    if (!isDefinition(node)) return false;

    return this.hasReferringNodes(schemaPointer) || this.areDefinitionParentsInUse(schemaPointer);
  }

  public areDefinitionParentsInUse(schemaPointer: string): boolean {
    const parent = this.getParentNode(schemaPointer);
    return this.isDefinitionInUse(parent.schemaPointer);
  }

  private deleteChildren(schemaPointer: string): void {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    if (isFieldOrCombination(node) && isNodeValidParent(node)) {
      node.children.forEach((childPointer) => {
        this.deleteNodeWithChildrenRecursively(childPointer);
      });
    }
  }

  public generateUniqueChildName(
    schemaPointer: string,
    namePrefix: string = '',
  ): string | undefined {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    const childPointers = isFieldOrCombination(node) ? node.children : [];
    const childNames = childPointers.map(extractNameFromPointer);
    return ArrayUtils.generateUniqueStringWithNumber(childNames, namePrefix);
  }

  public generateUniqueDefinitionName(namePrefix: string = ''): string {
    const definitions = this.getDefinitions();
    const definitionPointers = definitions.map((node) => node.schemaPointer);
    const definitionNames = definitionPointers.map(extractNameFromPointer);
    return ArrayUtils.generateUniqueStringWithNumber(definitionNames, namePrefix);
  }

  public changeCombinationType(
    schemaPointer: string,
    combinationType: CombinationKind,
  ): SchemaModel {
    const combinationNode = this.getNodeBySchemaPointer(schemaPointer);
    if (!isCombination(combinationNode)) throw Error(`${schemaPointer} is not a combination.`);
    const newNode: CombinationNode = { ...combinationNode, combinationType };
    this.updateNodeData(schemaPointer, newNode);
    this.updateChildPointers(newNode);
    return this;
  }

  public toggleIsArray(schemaPointer: string): SchemaModel {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    const newNode = { ...node, isArray: !node.isArray };
    this.updateNodeData(schemaPointer, newNode);
    if (isFieldOrCombination(newNode) && isNodeValidParent(newNode)) {
      this.updateChildPointers(newNode);
    }
    return this;
  }

  private updateChildPointers(node: FieldNode | CombinationNode): void {
    const { children } = node;
    children.forEach((schemaPointer) => {
      const nodeName = extractNameFromPointer(schemaPointer);
      const newPointer = createPropertyPointer(node, nodeName);
      this.changePointer(schemaPointer, newPointer);
    });
  }

  public isChildOfCombination(schemaPointer: string): boolean {
    if (isDefinitionPointer(schemaPointer)) return false; // Todo: This is necessary because definitions are in the same list as the root object properties in our internal structure. Remove this check when the data structure is fixed: https://github.com/Altinn/altinn-studio/issues/11824
    const parent = this.getParentNode(schemaPointer);
    return !!parent && isCombination(parent);
  }

  public convertToDefinition(schemaPointer: string): SchemaModel {
    // TODO: Make this method independent of convertPropToType: https://github.com/Altinn/altinn-studio/issues/11841
    const newModel = convertPropToType(this.deepClone(), schemaPointer);
    this.nodeMap.clear();
    newModel.getNodeMap().forEach((node) => this.nodeMap.set(node.schemaPointer, node));
    return this;
  }

  public willResultInCircularReferences(
    childSchemaPointer: string,
    parentSchemaPointer: string,
  ): boolean {
    const detector = new CircularReferenceDetector(this.nodeMap);
    return detector.willResultInCircularReferences(childSchemaPointer, parentSchemaPointer);
  }
}

const defaultNodePosition: NodePosition = { parentPointer: ROOT_POINTER, index: -1 };
